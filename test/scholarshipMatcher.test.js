const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateScholarship } = require('../scholarshipMatcher');

const completeProfile = {
    gpa: 3.8, sat: 1420, act: 31, citizenship: 'U.S. Citizen', residency: 'NY',
    major: 'Engineering', race: 'No Restriction', willing_essay: 1, first_gen: 1,
    leadership: 1, award: 1, income: 60000, has_ap: 1, has_honors: 1,
    has_dual_enrollment: 0
};

const scholarship = {
    min_gpa: 3.5, min_sat: 1400, min_act: 30, citizenship: 'U.S. Citizen', state: 'NY',
    major: 'Engineering', race: null, requires_essay: 1, first_gen_only: 1,
    leadership: 'preferred', award: 'preferred', min_income: null, max_income: 100000,
    advanced_coursework_preferred: 1, type: 'merit_plus_need', max_amount: 10000,
    renewable: 1, deadline: '2027-05-01'
};

test('confirmed failures eliminate a scholarship', () => {
    for (const [field, value] of [
        ['gpa', 3.0], ['citizenship', 'International Student'], ['residency', 'CA'],
        ['major', 'History'], ['willing_essay', 0], ['first_gen', 0]
    ]) {
        const result = evaluateScholarship({...completeProfile, [field]: value}, scholarship, '2026-09-12');
        assert.equal(result.eligible, false, field);
        assert.ok(result.eliminated_by.length, field);
    }
});

test('required leadership and awards eliminate negative and missing values', () => {
    const required = {...scholarship, leadership: 'required', award: 'required'};
    assert.equal(evaluateScholarship({...completeProfile, leadership: 0}, required).eligible, false);
    assert.equal(evaluateScholarship({...completeProfile, award: 0}, required).eligible, false);
    const unknown = evaluateScholarship({...completeProfile, leadership: null, award: null}, required);
    assert.equal(unknown.eligible, false);
    assert.equal(unknown.match_status, 'ineligible');
});

test('either SAT or ACT can satisfy a scholarship publishing both thresholds', () => {
    assert.equal(evaluateScholarship({...completeProfile, sat: 1200, act: 31}, scholarship).eligible, true);
    assert.equal(evaluateScholarship({...completeProfile, sat: 1420, act: 20}, scholarship).eligible, true);
    assert.equal(evaluateScholarship({...completeProfile, sat: 1200, act: 20}, scholarship).eligible, false);
});

test('preferred factors raise or lower ranking without eliminating', () => {
    const strong = evaluateScholarship(completeProfile, scholarship);
    const weak = evaluateScholarship({
        ...completeProfile, leadership: 0, award: 0, has_ap: 0, has_honors: 0, has_dual_enrollment: 0
    }, scholarship);
    assert.equal(weak.eligible, true);
    assert.ok(strong.score > weak.score);
});

test('missing required profile values use least-favorable assumptions', () => {
    const result = evaluateScholarship({ ...completeProfile, gpa: null, citizenship: null }, scholarship);
    assert.equal(result.eligible, false);
    assert.equal(result.match_status, 'ineligible');
});

test('closed cycles and passed deadlines are eliminated', () => {
    assert.equal(evaluateScholarship(completeProfile, {...scholarship, deadline: '2026-01-01'}, '2026-09-12').eligible, false);
    const researched = {...scholarship, research:{stale:false, cycle_status:'closed', rules:{}}};
    assert.equal(evaluateScholarship(completeProfile, researched, '2026-09-12').eligible, false);
});

test('scores are nonnegative integers', () => {
    const result = evaluateScholarship(completeProfile, scholarship);
    assert.ok(Number.isInteger(result.score));
    assert.ok(result.score >= 0);
});

test('researched multi-value rules take precedence over a single database value', () => {
    const researched = {
        ...scholarship,
        citizenship: 'U.S. Citizen',
        research: {stale:false, cycle_status:'open', rules:{citizenship:['U.S. Citizen','Permanent Resident']}}
    };
    assert.equal(evaluateScholarship({...completeProfile, citizenship:'Permanent Resident'}, researched).eligible, true);
});
