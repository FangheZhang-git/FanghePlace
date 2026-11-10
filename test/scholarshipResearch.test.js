const test = require('node:test');
const assert = require('node:assert/strict');
const {researchMatch,attachResearch}=require('../scholarshipResearch');
const {scholarships}=require('../database/research/moderate-scholarships');
const {validate,researchFor}=require('../database/import-moderate-scholarships');
const batch2=require('../database/research/moderate-scholarships-batch-2').scholarships;
const batch2Import=require('../database/import-moderate-scholarships-batch-2');
const batch3=require('../database/research/competitive-scholarships-batch-3').scholarships;
const batch3Import=require('../database/import-competitive-scholarships-batch-3');
const day='2026-09-02';
const qualified={gpa:3.8,sat:1400,act:30,citizenship:'U.S. Citizen',residency:'NY',willing_essay:1};
const jimmy=scholarships.find(s=>s.name==='Jimmy Rane Foundation Scholarship');

test('all 20 research records validate without invented positive SAT/ACT cutoffs',()=>{
    validate();
    for (const s of scholarships) {
        assert.ok(s.min_sat===null || s.min_sat===0);
        assert.ok(s.min_act===null || s.min_act===0);
        assert.equal(s.research.accepted_applicant_gpa,null);
    }
    assert.equal(scholarships.find(s=>s.name==='Tzu Chi USA Scholars').min_gpa,null);
    assert.equal(scholarships.find(s=>s.name==='Cancer for College Scholarship').max_income,null);
});
test('second batch contains 20 distinct, source-backed records with unknowns preserved',()=>{
    batch2Import.validate();
    assert.equal(batch2.length,20);
    assert.equal(new Set(batch2.map(s=>s.name)).size,20);
    for (const s of batch2) {
        assert.ok(s.min_sat===null || s.min_sat===0);
        assert.ok(s.min_act===null || s.min_act===0);
        assert.equal(s.research.accepted_applicant_gpa,null);
        assert.ok(s.research.sources.length);
    }
    assert.equal(batch2.find(s=>s.name==='Steven H. Strogatz Prize for Math Communication').min_amount,null);
    assert.equal(batch2.find(s=>s.name==='Matthew E. Minor Memorial Scholarship').min_gpa,3);
});
test('approved competitive batch contains 50 distinct, source-backed records',()=>{
    batch3Import.validate();
    assert.equal(batch3.length,50);
    assert.equal(new Set(batch3.map(s=>s.name)).size,50);
    assert.equal(new Set([...scholarships,...batch2,...batch3].map(s=>s.apply_url)).size,90);
    for (const s of batch3) {
        assert.equal(s.research.accepted_applicant_gpa,null);
        assert.equal(s.research.accepted_applicant_sat,null);
        assert.equal(s.research.accepted_applicant_act,null);
        assert.ok(s.research.sources.length);
        assert.ok(/^https?:/.test(s.apply_url));
    }
    assert.equal(batch3.find(s=>s.name==='Lighthouse Scholarship').min_sat,1080);
    assert.equal(batch3.find(s=>s.name==='Hansen Leaders of Tomorrow Scholarship').min_act,23);
});
test('qualified researched match receives a numeric score',()=>{
    const result=researchMatch(qualified,jimmy,day);
    assert.equal(result.match_status,'eligible');
    assert.ok(Number.isInteger(result.score));
});
test('known GPA, geography and citizenship disqualification exclude records',()=>{
    assert.equal(researchMatch({...qualified,gpa:2},jimmy,day),null);
    assert.equal(researchMatch({...qualified,residency:'CA'},jimmy,day),null);
    assert.equal(researchMatch({...qualified,citizenship:'International Student'},jimmy,day),null);
});
test('missing required student data uses the least-favorable assumption',()=>{
    const result=researchMatch({...qualified,gpa:null,residency:null},jimmy,day);
    assert.equal(result,null);
});
test('unknown scholarship thresholds and unrestricted fields never become hard filters',()=>{
    const aes=scholarships[0];
    const result=researchMatch({gpa:null,sat:null,act:null,willing_essay:'1',major:'Other'},aes,day);
    assert.equal(result.match_status,'eligible');
    assert.equal(aes.min_sat,null);
});
test('boolean strings are normalized and unknown preferences remain conditional',()=>{
    assert.ok(researchMatch({...qualified,willing_essay:'1'},jimmy,day));
    assert.equal(researchMatch({...qualified,willing_essay:'0'},jimmy,day),null);
    assert.equal(researchMatch({...qualified,willing_essay:false},jimmy,day),null);
    assert.equal(researchMatch({...qualified,willing_essay:null},jimmy,day),null);
});
test('closed and expired cycles are discoverable but not returned as current matches',()=>{
    assert.equal(researchMatch(qualified,scholarships.find(s=>s.name==='FEEA Scholarship'),day),null);
    assert.equal(researchMatch(qualified,scholarships[0],'2026-10-09'),null);
});
test('database decimal strings do not make research stale; edits do',async()=>{
    const s={...jimmy,id:90,min_gpa:'3.00'};
    const db={query:async()=>[[{scholarship_id:90,research_json:researchFor(jimmy)}]]};
    assert.equal((await attachResearch(db,[s]))[0].research.stale,false);
    assert.equal((await attachResearch(db,[{...s,min_gpa:'3.50'}]))[0].research.stale,true);
});
