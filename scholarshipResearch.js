const { evaluateScholarship } = require('./scholarshipMatcher');

// Research is kept separately so nullable legacy fields and multi-value
// eligibility rules can retain their meaning without changing crawler enums.
function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

async function attachResearch(db, rows) {
    if (!rows.length) return rows;
    const ids=rows.map(r=>r.id);
    let researchRows;
    try {
        [researchRows]=await db.query(`SELECT scholarship_id,research_json FROM scholarship_research WHERE scholarship_id IN (${ids.map(()=>'?').join(',')})`,ids);
    } catch (error) {
        if (error.code==='ER_NO_SUCH_TABLE') return rows;
        throw error;
    }
    const records=new Map(researchRows.map(r=>[String(r.scholarship_id),typeof r.research_json==='string'?JSON.parse(r.research_json):r.research_json]));
    return rows.map(row=>{
        const research=records.get(String(row.id));
        if (!research) return row;
        const changed=Object.entries(research.record_at_review || {}).some(([key,value])=>{
            if (value===null) return row[key]!==null;
            if (typeof value==='number') return numberOrNull(row[key])!==value;
            return row[key]!==value;
        });
        const {record_at_review, inferred_fields, inference_policy, ...publicResearch}=research;
        return {...row,research:{...publicResearch,stale:changed}};
    });
}

function researchMatch(profile, scholarship, today=new Date().toISOString().slice(0,10)) {
    const r=scholarship.research;
    if (!r) throw new Error('Research is required');
    const evaluation=evaluateScholarship(profile,scholarship,today);
    if (!evaluation.eligible) return null;
    return {
        ...scholarship,
        score:evaluation.score,
        match_status:'eligible'
    };
}

module.exports={attachResearch,researchMatch};
