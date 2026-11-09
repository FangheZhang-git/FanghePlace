const { CITIZENSHIP_VALUES, STATE_NAMES, MAJOR_VALUES, RACE_VALUES,
    REQUIREMENT_VALUES, SCHOLARSHIP_TYPE_VALUES } = require('./crawler/src/categories');

const scholarship = {
    strings: { name: 255, provider: 255, description: 10000, apply_url: 500, deadline: 50, major: 100 },
    numbers: { min_amount: 2147483647, max_amount: 2147483647, min_gpa: 4,
        min_sat: 1600, min_act: 36, min_income: 2147483647, max_income: 2147483647 },
    booleans: ['requires_essay', 'first_gen_only', 'renewable', 'advanced_coursework_preferred'],
    enums: { citizenship: CITIZENSHIP_VALUES, state: [...Object.keys(STATE_NAMES), 'any', 'No Restriction'],
        leadership: REQUIREMENT_VALUES, award: REQUIREMENT_VALUES, race: [...RACE_VALUES, 'No Restriction', 'any'], type: SCHOLARSHIP_TYPE_VALUES }
};
const profile = {
    strings: { major: 100 },
    numbers: { gpa: 4, sat: 1600, act: 36, ap_count: 100, ap_high_scores: 100,
        honors_count: 100, dual_enrollment_count: 100, income: 2147483647, household_size: 100 },
    booleans: ['has_ap', 'has_honors', 'has_dual_enrollment', 'first_gen', 'leadership', 'award', 'willing_essay'],
    enums: { citizenship: CITIZENSHIP_VALUES.filter(v => v !== 'No Restriction'),
        residency: Object.keys(STATE_NAMES), race: RACE_VALUES, major: MAJOR_VALUES,
        gender: ['Male', 'Female', 'Nonbinary', 'Other', 'Prefer Not to Say'] }
};
function validateFields(data, schema) {
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === '' || value === undefined) continue;
        if (key in schema.strings && (typeof value !== 'string' || value.length > schema.strings[key])) return `Invalid ${key}`;
        if (key in schema.enums && !schema.enums[key].includes(value)) return `Invalid ${key}`;
        if (key in schema.numbers) {
            if (!['number', 'string'].includes(typeof value) || !String(value).trim() ||
                !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > schema.numbers[key] ||
                (!key.includes('gpa') && !Number.isInteger(Number(value)))) return `Invalid ${key}`;
            data[key] = Number(value);
        }
        if (schema.booleans.includes(key)) {
            if (![0, 1, '0', '1', true, false].includes(value)) return `Invalid ${key}`;
            data[key] = value === true || value === 1 || value === '1' ? 1 : 0;
        }
    }
    if (data.apply_url) {
        try {
            if (!['http:', 'https:'].includes(new URL(data.apply_url).protocol)) return 'Invalid apply_url';
        } catch { return 'Invalid apply_url'; }
    }
    for (const pair of [['min_amount', 'max_amount'], ['min_income', 'max_income']]) {
        if (data[pair[0]] != null && data[pair[0]] !== '' && data[pair[1]] != null && data[pair[1]] !== '' &&
            Number(data[pair[0]]) > Number(data[pair[1]])) return `Invalid ${pair[0]} range`;
    }
    return null;
}
function validateWrite(req, res, next) {
    let error;
    if (req.method === 'POST' && req.path === '/profile') error = validateFields(req.body, profile);
    if (['POST', 'PUT'].includes(req.method) &&
        (req.path === '/submit-scholarship' || /^\/admin\/(scholarships|submissions)(\/\d+)?$/.test(req.path))) {
        error = validateFields(req.body, scholarship);
        if (!error && (typeof req.body.name !== 'string' || !req.body.name.trim())) error = 'Scholarship name is required';
    }
    if (req.path === '/toggle-save' && req.method === 'POST' &&
        (!Number.isSafeInteger(Number(req.body.scholarship_id)) || Number(req.body.scholarship_id) <= 0)) error = 'Invalid scholarship ID';
    if (error) return res.status(400).json({ message: error });
    next();
}
module.exports = { validateWrite, validateFields, scholarship, profile };
