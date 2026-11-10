// Run without --apply for a read-only duplicate/schema check. Import is manual,
// transactional, and separate from the crawler. No existing rows are overwritten.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { fields, scholarships } = require('./research/competitive-scholarships-batch-3');

function canonicalUrl(url) {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
}

function validate() {
    assert.equal(scholarships.length, 50);
    assert.equal(new Set(scholarships.map(s => s.name)).size, 50);
    for (const s of scholarships) {
        assert.ok(s.name && s.provider && s.description);
        assert.ok(/^https?:/.test(new URL(s.apply_url).protocol));
        for (const field of fields) assert.notEqual(s[field], undefined, `${s.name}: ${field}`);
        for (const f of ['requires_essay','first_gen_only','renewable','advanced_coursework_preferred'])
            assert.ok([null,0,1].includes(s[f]), `${s.name}: ${f}`);
        for (const f of ['leadership','award'])
            assert.ok([null,'required','preferred','not_considered'].includes(s[f]));
        assert.ok([null,'pure_merit_based','pure_need_based','merit_plus_need'].includes(s.type));
        assert.ok([null,'No Restriction','U.S. Citizen','Permanent Resident','International Student'].includes(s.citizenship));
        for (const [f,max] of [['min_gpa',4],['min_sat',1600],['min_act',36]])
            assert.ok(s[f] === null || (Number.isFinite(s[f]) && s[f] >= 0 && s[f] <= max));
        for (const f of ['min_amount','max_amount','min_income','max_income'])
            assert.ok(s[f] === null || (Number.isSafeInteger(s[f]) && s[f] >= 0));
        assert.ok(s.deadline === null || /^\d{4}-\d{2}-\d{2}$/.test(s.deadline));
        for (const src of s.research.sources) assert.ok(/^https?:/.test(new URL(src.url).protocol));
        for (const f of fields.filter(f => s[f] !== null)) assert.ok(s.research.field_sources[f].length);
    }
}

function researchFor(s) {
    return {...s.research, record_at_review:Object.fromEntries(fields.map(f => [f,s[f]]))};
}

function report() {
    const lines = ['# Fifty competitive scholarships — research and import record',
        '', 'Checked September 9, 2026. Official requirements take priority over directory listings and anonymous anecdotes. Unknown fields are blank/SQL NULL. Zero means an explicitly absent academic minimum, never a guess. GPA values describe high-school applicants unless a conditional rule is stated. No accepted-applicant GPA/SAT/ACT distribution or acceptance rate was established for these programs.',
        '', 'The source manifest is competitive-scholarships-batch-3.js. Additional conditions and their provenance are stored in scholarship_research and exposed on the website. Some programs are closed or not yet open. A listing is not proof that a student qualifies.', ''];
    for (const s of scholarships) {
        lines.push(`## ${s.name}`, '', '| Database field | Value |', '|---|---|');
        for (const f of fields) lines.push(`| ${f} | ${s[f] === null ? '' : String(s[f]).replace(/\|/g,'/').replace(/\n/g,' ')} |`);
        const r=s.research;
        lines.push('',`GPA: ${r.gpa_notes}`, '', `SAT: ${r.sat_notes}`, '', `ACT: ${r.act_notes}`, '',
            `Cycle: ${r.cycle_notes || r.cycle_status}`, '', `Award basis: ${r.award_basis}`, '',
            `Citizenship: ${r.citizenship_notes || ''}`, '', `Residency: ${r.residency_notes || ''}`, '', `Renewal: ${r.renewal_notes || ''}`, '',
            'Requirements:', ...r.requirements.map(x=>`- ${x}`), '', 'Application materials:', ...r.materials.map(x=>`- ${x}`), '',
            'Selection:', ...r.selection.map(x=>`- ${x}`), '', `Reputation assessment: ${r.reputation}`, '', 'Recipient/applicant evidence:');
        if (!r.experiences.length) lines.push('No reliable firsthand experience verified.');
        for (const e of r.experiences) lines.push(`- **${e.kind}**: ${e.text} [Source](${e.url})`);
        lines.push('', 'Sources:', ...r.sources.map(x=>`- [${x.kind}](${x.url})`), '',
            'Accepted-applicant GPA: ', 'Accepted-applicant SAT: ', 'Accepted-applicant ACT: ', 'Acceptance rate: ', '');
    }
    fs.writeFileSync(path.join(__dirname,'research/competitive-scholarships-batch-3-2026-09-09.md'),lines.join('\n'));
}

function snapshot() {
    const file=path.join(__dirname,'../scholarmatch-production.sql');
    const marker='-- BEGIN reviewed competitive scholarships batch 3 2026-09-09';
    const original=fs.readFileSync(file,'utf8');
    const endMarker='-- END reviewed competitive scholarships batch 3 2026-09-09';
    let base=original;
    if (original.includes(marker)) {
        const start=original.indexOf(marker);
        const end=original.indexOf(endMarker,start);
        assert.ok(end>start,'Incomplete generated snapshot block');
        base=original.slice(0,start)+original.slice(end+endMarker.length);
    }
    const sql=[marker, fs.readFileSync(path.join(__dirname,'migrations/002_add_scholarship_research.sql'),'utf8')];
    for (const s of scholarships) {
        sql.push(mysql.format(`INSERT INTO scholarships (${fields.map(f=>'`'+f+'`').join(',')}) VALUES (${fields.map(()=>'?').join(',')});`,fields.map(f=>s[f])));
        sql.push(mysql.format('INSERT INTO scholarship_research (scholarship_id,research_json,checked_on) SELECT id,?,? FROM scholarships WHERE name=? AND apply_url=?;',
            [JSON.stringify(researchFor(s)),s.research.checked_on,s.name,s.apply_url]));
    }
    sql.push('-- END reviewed competitive scholarships batch 3 2026-09-09','');
    fs.writeFileSync(file,base.trimEnd()+'\n\n'+sql.join('\n'));
}

async function run() {
    validate();
    if (process.argv.includes('--report')) { report(); return; }
    if (process.argv.includes('--snapshot')) { snapshot(); return; }
    const db=await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,
        password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:10000});
    let locked=false;
    try {
        const [columns]=await db.query('SHOW COLUMNS FROM scholarships');
        for (const f of fields) assert.ok(columns.some(c=>c.Field===f),`Missing column ${f}`);
        const [existing]=await db.query('SELECT id,name,apply_url FROM scholarships');
        const duplicates=scholarships.map(s=>({name:s.name,rows:existing.filter(x=>
            x.name.toLowerCase().replace(/[^a-z0-9]/g,'')===s.name.toLowerCase().replace(/[^a-z0-9]/g,'') ||
            (x.apply_url && canonicalUrl(x.apply_url)===canonicalUrl(s.apply_url)))})).filter(x=>x.rows.length);
        console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'read-only',candidates:50,duplicates},null,2));
        if (!process.argv.includes('--apply')) return;
        const [[lock]]=await db.query("SELECT GET_LOCK('scholarmatch-competitive-batch3-2026-09',10) AS acquired");
        assert.equal(lock.acquired,1,'Import lock unavailable'); locked=true;
        await db.query(fs.readFileSync(path.join(__dirname,'migrations/002_add_scholarship_research.sql'),'utf8'));
        await db.beginTransaction();
        const imported=[];
        for (const s of scholarships) {
            const [rows]=await db.query('SELECT * FROM scholarships WHERE name=? OR apply_url=? FOR UPDATE',[s.name,s.apply_url]);
            if (rows.length) {
                assert.equal(rows.length,1,`Ambiguous duplicate: ${s.name}`);
                const [research]=await db.query('SELECT research_json FROM scholarship_research WHERE scholarship_id=?',[rows[0].id]);
                assert.equal(research.length,1,`Existing unreviewed row: ${s.name}; refusing to overwrite.`);
                for (const f of fields) assert.equal(typeof s[f]==='number'?Number(rows[0][f]):rows[0][f],s[f],`Existing row differs: ${s.name}/${f}`);
                imported.push({id:rows[0].id,name:s.name,status:'already imported'});
                continue;
            }
            // A normalized duplicate discovered above requires review, never another insert.
            assert.ok(!duplicates.some(d=>d.name===s.name),`Possible duplicate: ${s.name}`);
            const [result]=await db.execute(`INSERT INTO scholarships (${fields.map(f=>'`'+f+'`').join(',')}) VALUES (${fields.map(()=>'?').join(',')})`,fields.map(f=>s[f]));
            await db.execute('INSERT INTO scholarship_research (scholarship_id,research_json,checked_on) VALUES (?,?,?)',
                [result.insertId,JSON.stringify(researchFor(s)),s.research.checked_on]);
            imported.push({id:result.insertId,name:s.name,status:'inserted'});
        }
        // Round-trip every field, including intentional NULLs, before commit.
        for (const s of scholarships) {
            const [[row]]=await db.query('SELECT * FROM scholarships WHERE name=? AND apply_url=?',[s.name,s.apply_url]);
            for (const f of fields) {
                const actual = ['min_gpa'].includes(f) && row[f]!==null ? Number(row[f]) : row[f];
                assert.equal(actual,s[f],`Round-trip mismatch ${s.name}/${f}`);
            }
            const [[r]]=await db.query('SELECT research_json FROM scholarship_research WHERE scholarship_id=?',[row.id]);
            assert.deepEqual(typeof r.research_json==='string'?JSON.parse(r.research_json):r.research_json,researchFor(s));
        }
        await db.commit();
        console.log(JSON.stringify({verified:imported.length,records:imported},null,2));
    } catch(error) {
        await db.rollback(); throw error;
    } finally {
        if (locked) await db.query("SELECT RELEASE_LOCK('scholarmatch-competitive-batch3-2026-09')");
        await db.end();
    }
}

if (require.main===module) run().catch(e=>{console.error(e.stack || e.code || e.message);process.exitCode=1;});
module.exports={validate,researchFor};
