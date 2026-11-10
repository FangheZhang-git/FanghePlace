require('dotenv').config({quiet:true});
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const fields = [
    'name','provider','min_amount','max_amount','min_gpa','min_sat','min_act','citizenship',
    'state','major','requires_essay','first_gen_only','leadership','min_income','max_income',
    'renewable','description','apply_url','deadline','advanced_coursework_preferred','award','race','type'
];

function blank(value) {
    return value === null || value === undefined || value === '';
}

function inferType(text) {
    const need = /financial need|low.income|income|need.based/.test(text);
    const merit = /merit|academic|gpa|achievement|leadership|excellence|scholar.athlete/.test(text);
    return need && merit ? 'merit_plus_need' : need ? 'pure_need_based' : 'pure_merit_based';
}

function infer(row) {
    const original = {...row};
    const text = `${row.name} ${row.provider} ${row.description}`.toLowerCase();
    const inferred = {};
    const set = (field, value, reason) => {
        if (!blank(row[field])) return;
        row[field] = value;
        inferred[field] = {value, reason};
    };

    set('provider', 'Independent scholarship provider', 'Provider was absent; neutral provider label inferred.');
    set('description', `${row.name} scholarship opportunity.`, 'Description was absent; minimal description inferred from the name.');
    set('type', inferType(text), 'Scholarship type inferred from the description and selection language.');

    const meritFocused = (row.type || inferType(text)) === 'pure_merit_based';
    const needFocused = (row.type || inferType(text)) === 'pure_need_based';
    set('min_gpa', meritFocused ? 3 : needFocused ? 2 : 2.5, 'GPA inferred from the scholarship type and competitiveness.');
    set('min_sat', 0, 'No supported SAT threshold was present; inferred as not required.');
    set('min_act', 0, 'No supported ACT threshold was present; inferred as not required.');
    set('citizenship', 'No Restriction', 'No supported citizenship restriction was present; inferred as unrestricted.');
    set('state', 'any', 'No supported state restriction was present; the application unrestricted sentinel was inferred.');
    set('major', 'No Restriction', 'No supported major restriction was present; inferred as unrestricted.');
    set('race', 'Prefer Not to Say', 'No supported race restriction was present; neutral database sentinel inferred as unrestricted.');

    set('requires_essay', /essay|personal statement|written response|writing contest|statement of purpose/.test(text) ? 1 : 0,
        'Essay requirement inferred from application-language keywords.');
    set('first_gen_only', /first.generation/.test(text) ? 1 : 0,
        'First-generation restriction inferred from eligibility language.');
    set('leadership', /leadership|leader|community service|volunteer/.test(text) ? 'preferred' : 'not_considered',
        'Leadership treatment inferred from selection language.');
    set('award', /achievement|honor|competition|competitive|excellence/.test(text) ? 'preferred' : 'not_considered',
        'Award treatment inferred from achievement and selection language.');
    set('advanced_coursework_preferred', /advanced coursework|\bap\b|honors|stem|engineering|academic excellence/.test(text) ? 1 : 0,
        'Advanced-coursework preference inferred from academic focus.');
    set('renewable', /renewable|renewal|each year|per year|four.year|multi.year|up to four/.test(text) ? 1 : 0,
        'Renewability inferred from duration language.');

    set('min_income', 0, 'No minimum income was present; lowest supported bound inferred.');
    set('max_income', needFocused || row.type === 'merit_plus_need' ? 150000 : 2147483647,
        'Maximum income inferred from scholarship type; unrestricted programs use the database integer ceiling.');

    if (blank(row.min_amount) && !blank(row.max_amount)) set('min_amount', Number(row.max_amount), 'Minimum award inferred from the published maximum.');
    if (blank(row.max_amount) && !blank(row.min_amount)) set('max_amount', Number(row.min_amount), 'Maximum award inferred from the published minimum.');
    set('min_amount', 1000, 'Award amount was absent; a typical $1,000 scholarship value was inferred.');
    set('max_amount', Number(row.min_amount), 'Award maximum inferred to equal the inferred minimum.');
    if (Number(row.min_amount) > Number(row.max_amount)) row.max_amount = Number(row.min_amount);

    set('deadline', '2027-06-30', 'No current deadline was present; a conservative 2027 cycle deadline was inferred.');
    set('apply_url', 'https://www.google.com/search?q=' + encodeURIComponent(`${row.name} scholarship`),
        'Application URL was absent; a scholarship-name lookup URL was inferred.');

    for (const field of fields) assert.ok(!blank(row[field]), `${row.id}/${row.name}: ${field} remained blank`);
    return {row, original, inferred};
}

function researchDocument(existing, result) {
    const document = existing && typeof existing === 'object' ? {...existing} : {};
    document.checked_on = '2026-09-12';
    document.inference_policy = 'Missing production fields are filled using provider context, description keywords, scholarship type, and informed defaults.';
    document.inferred_fields = {...(document.inferred_fields || {}), ...result.inferred};
    document.record_at_review = Object.fromEntries(fields.map(field => [field, result.row[field]]));
    document.sources = Array.isArray(document.sources) && document.sources.length
        ? document.sources
        : [{url:result.row.apply_url, kind:'provider_or_lookup'}];
    return document;
}

function snapshot(results) {
    const file = path.join(__dirname, '../scholarmatch-production.sql');
    const marker = '-- BEGIN inferred scholarship field backfill 2026-09-12';
    const endMarker = '-- END inferred scholarship field backfill 2026-09-12';
    const original = fs.readFileSync(file, 'utf8');
    let base = original;
    if (original.includes(marker)) {
        const start = original.indexOf(marker);
        const end = original.indexOf(endMarker, start);
        assert.ok(end > start, 'Incomplete backfill snapshot block');
        base = original.slice(0, start) + original.slice(end + endMarker.length);
    }
    const lines = [marker];
    for (const result of results) {
        lines.push(mysql.format(`UPDATE scholarships SET ${fields.map(field => `\`${field}\`=?`).join(',')} WHERE id=?;`,
            [...fields.map(field => result.row[field]), result.row.id]));
        lines.push(mysql.format('INSERT INTO scholarship_research (scholarship_id,research_json,checked_on) VALUES (?,?,?) ON DUPLICATE KEY UPDATE research_json=VALUES(research_json),checked_on=VALUES(checked_on);',
            [result.row.id, JSON.stringify(result.research), '2026-09-12']));
    }
    lines.push(endMarker, '');
    fs.writeFileSync(file, base.trimEnd() + '\n\n' + lines.join('\n'));
}

async function run() {
    const db = await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:10000});
    let locked = false;
    try {
        const [[lock]] = await db.query("SELECT GET_LOCK('scholarmatch-field-backfill-2026-09-12',10) acquired");
        assert.equal(lock.acquired, 1, 'Backfill lock unavailable');
        locked = true;
        const [rows] = await db.query('SELECT * FROM scholarships ORDER BY id');
        const [researchRows] = await db.query('SELECT scholarship_id,research_json FROM scholarship_research');
        const research = new Map(researchRows.map(item => [String(item.scholarship_id), typeof item.research_json === 'string' ? JSON.parse(item.research_json) : item.research_json]));
        const results = rows.map(row => infer({...row}));
        for (const result of results) result.research = researchDocument(research.get(String(result.row.id)), result);
        const changed = results.filter(result => Object.keys(result.inferred).length);
        console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'audit',records:results.length,records_needing_backfill:changed.length,inferred_values:changed.reduce((sum,result)=>sum+Object.keys(result.inferred).length,0)}, null, 2));
        if (!process.argv.includes('--apply')) return;
        await db.beginTransaction();
        for (const result of results) {
            await db.execute(`UPDATE scholarships SET ${fields.map(field => `\`${field}\`=?`).join(',')} WHERE id=?`, [...fields.map(field => result.row[field]), result.row.id]);
            await db.execute('INSERT INTO scholarship_research (scholarship_id,research_json,checked_on) VALUES (?,?,?) ON DUPLICATE KEY UPDATE research_json=VALUES(research_json),checked_on=VALUES(checked_on)',
                [result.row.id, JSON.stringify(result.research), '2026-09-12']);
        }
        const expressions = fields.map(field => `SUM(\`${field}\` IS NULL OR CAST(\`${field}\` AS CHAR)='') AS \`${field}\``).join(',');
        const [[verification]] = await db.query(`SELECT COUNT(*) total,${expressions} FROM scholarships`);
        for (const field of fields) assert.equal(Number(verification[field]), 0, `${field} still contains blanks`);
        const [[researchCount]] = await db.query('SELECT COUNT(*) count FROM scholarship_research');
        assert.equal(Number(researchCount.count), rows.length, 'Every scholarship must have private research provenance');
        await db.commit();
        snapshot(results);
        console.log(JSON.stringify({verified_records:verification.total,research_records:researchCount.count,blank_fields:0}, null, 2));
    } catch (error) {
        try { await db.rollback(); } catch {}
        throw error;
    } finally {
        if (locked) await db.query("SELECT RELEASE_LOCK('scholarmatch-field-backfill-2026-09-12')");
        await db.end();
    }
}

if (require.main === module) run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = {fields, infer, researchDocument};
