function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function booleanOrNull(value) {
    if (value === true || value === 1 || value === "1") return true;
    if (value === false || value === 0 || value === "0") return false;
    return null;
}

function isUnrestricted(value) {
    return value === null || value === undefined || value === "" ||
        ["any", "no restriction", "prefer not to say"].includes(String(value).trim().toLowerCase());
}

function sameValue(left, right) {
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}

function dateOnly(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
}

function evaluateScholarship(profile, scholarship, today = new Date().toISOString().slice(0, 10)) {
    const eliminatedBy = [];
    const scoreBreakdown = [];
    let score = 50;

    function profileNumber(field) {
        const value = numberOrNull(profile[field]);
        return value !== null ? value : field === "income" ? 200000 : 0;
    }

    function adjust(factor, points, reason) {
        score += points;
        scoreBreakdown.push({ factor, points, reason });
    }

    function threshold(field, profileField, label, direction = "minimum") {
        const requirement = numberOrNull(scholarship[field]);
        if (requirement === null || requirement === 0) return;
        const value = profileNumber(profileField);
        const failed = direction === "maximum" ? value > requirement : value < requirement;
        if (failed) eliminatedBy.push(`${label} does not meet the published ${direction} of ${requirement}.`);
    }

    threshold("min_gpa", "gpa", "GPA");
    threshold("min_income", "income", "household income");
    threshold("max_income", "income", "household income", "maximum");

    // When both test thresholds exist, scholarship records generally mean SAT OR ACT.
    const satMinimum = numberOrNull(scholarship.min_sat);
    const actMinimum = numberOrNull(scholarship.min_act);
    const sat = profileNumber("sat");
    const act = profileNumber("act");
    const hasSatRule = satMinimum !== null && satMinimum > 0;
    const hasActRule = actMinimum !== null && actMinimum > 0;
    if (hasSatRule && hasActRule) {
        if (!(sat >= satMinimum || act >= actMinimum)) {
            eliminatedBy.push(`Test score does not meet either the ${satMinimum} SAT or ${actMinimum} ACT requirement.`);
        }
    } else if (hasSatRule) threshold("min_sat", "sat", "SAT");
    else if (hasActRule) threshold("min_act", "act", "ACT");

    const research = scholarship.research;
    if (research && !research.stale) {
        const closingDate = dateOnly(research.closes_on || scholarship.deadline);
        if (research.cycle_status === "closed" || (closingDate && closingDate < today)) {
            eliminatedBy.push("The published application cycle is closed.");
        }
    } else if (!research && dateOnly(scholarship.deadline) && dateOnly(scholarship.deadline) < today) {
        eliminatedBy.push("The published deadline has passed.");
    }

    const researchRules = research && !research.stale ? research.rules || {} : {};
    for (const [profileField, allowed, label] of [
        ["residency", researchRules.states, "residency"],
        ["citizenship", researchRules.citizenship, "citizenship"]
    ]) {
        if (!Array.isArray(allowed) || !allowed.length) continue;
        const value = profile[profileField];
        if (!value || !allowed.some(option => sameValue(option, value))) eliminatedBy.push(`${label} is outside the published eligible options.`);
    }

    for (const [scholarshipField, profileField, label, points] of [
        ["citizenship", "citizenship", "citizenship", 2],
        ["state", "residency", "residency", 4],
        ["major", "major", "major", 7],
        ["race", "race", "race or ethnicity", 2]
    ]) {
        if (scholarshipField === "citizenship" && Array.isArray(researchRules.citizenship)) continue;
        if (scholarshipField === "state" && Array.isArray(researchRules.states)) continue;
        const requirement = scholarship[scholarshipField];
        if (isUnrestricted(requirement)) continue;
        const value = profile[profileField];
        if (!value || !sameValue(requirement, value)) eliminatedBy.push(`${label} does not match the published requirement.`);
        else adjust(label, points * 2, `Exact ${label} match.`);
    }

    for (const [scholarshipField, profileField, label] of [
        ["requires_essay", "willing_essay", "essay willingness"],
        ["first_gen_only", "first_gen", "first-generation status"]
    ]) {
        if (booleanOrNull(scholarship[scholarshipField]) !== true) continue;
        const value = booleanOrNull(profile[profileField]);
        if (value !== true) eliminatedBy.push(`The scholarship requires ${label}.`);
        else adjust(label, scholarshipField === "first_gen_only" ? 12 : 6, `Meets the ${label} requirement.`);
    }

    for (const [field, label, positive, negative] of [
        ["leadership", "leadership", 22, -16],
        ["award", "awards", 20, -14]
    ]) {
        const preference = scholarship[field];
        if (!preference || preference === "not_considered") continue;
        const value = booleanOrNull(profile[field]);
        if (preference === "required") {
            if (value === false) eliminatedBy.push(`The scholarship requires ${label}.`);
            else if (value === null) eliminatedBy.push(`The scholarship requires ${label}.`);
            else adjust(label, positive, `Meets the required ${label} criterion.`);
        } else if (preference === "preferred") {
            if (value === true) adjust(label, positive, `Matches the preferred ${label} criterion.`);
            else if (value === false) adjust(label, negative, `Does not match the preferred ${label} criterion.`);
            else adjust(label, negative, `Missing ${label} is scored as not meeting the preference.`);
        }
    }

    const advancedPreferred = booleanOrNull(scholarship.advanced_coursework_preferred) === true;
    if (advancedPreferred) {
        const advancedValues = [profile.has_ap, profile.has_honors, profile.has_dual_enrollment].map(booleanOrNull);
        if (advancedValues.some(value => value === true)) adjust("advanced coursework", 18, "Matches the advanced-coursework preference.");
        else adjust("advanced coursework", -12, "Missing or absent advanced coursework does not match the preference.");
    }

    const gpa = profileNumber("gpa");
    const gpaMinimum = numberOrNull(scholarship.min_gpa);
    if (gpa !== null && gpaMinimum !== null && gpaMinimum > 0 && gpa >= gpaMinimum) {
        adjust("GPA fit", Math.min(30, 16 + Math.round((gpa - gpaMinimum) * 14)), "GPA meets or exceeds the published minimum.");
    } else if (scholarship.type === "pure_merit_based") {
        adjust("academic strength", Math.max(-18, Math.min(24, Math.round((gpa - 2.5) * 16))), "Academic strength affects a merit-based application.");
    }

    const testFits = [];
    if (hasSatRule && sat >= satMinimum) testFits.push(Math.min(25, 14 + Math.floor((sat - satMinimum) / 25)));
    if (hasActRule && act >= actMinimum) testFits.push(Math.min(25, 14 + Math.floor((act - actMinimum))));
    if (testFits.length) adjust("test-score fit", Math.max(...testFits), "SAT or ACT meets the published test requirement.");

    const income = profileNumber("income");
    if (["pure_need_based", "merit_plus_need"].includes(scholarship.type)) {
        const needPoints = income <= 30000 ? 24 : income <= 60000 ? 18 : income <= 100000 ? 10 : income <= 150000 ? 2 : -18;
        adjust("financial-need fit", needPoints, "Household-income range affects the scholarship's need component.");
    }

    const awardAmount = numberOrNull(scholarship.max_amount) ?? numberOrNull(scholarship.min_amount);
    if (awardAmount && awardAmount > 0) adjust("award value", Math.min(18, Math.max(3, Math.round(Math.log10(awardAmount) * 5 - 8))), "Award value affects ranking.");
    if (booleanOrNull(scholarship.renewable) === true) adjust("renewability", 10, "Renewable funding increases ranking.");

    return {
        eligible: eliminatedBy.length === 0,
        score: Math.max(0, Math.round(score)),
        match_status: eliminatedBy.length ? "ineligible" : "eligible",
        confirmation_needed: [],
        eliminated_by: [...new Set(eliminatedBy)]
    };
}

module.exports = { booleanOrNull, evaluateScholarship, isUnrestricted, numberOrNull };
