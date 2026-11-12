function numberOrNull(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return null;
    }
    return number;
}

function booleanOrNull(value) {
    if (value === true || value === 1 || value === "1") {
        return true;
    }
    if (value === false || value === 0 || value === "0") {
        return false;
    }
    return null;
}

function isUnrestricted(value) {
    if (value === null || value === undefined || value === "") {
        return true;
    }
    const normalized = String(value).trim().toLowerCase();
    return ["any", "no restriction", "prefer not to say"].includes(normalized);
}

function sameValue(left, right) {
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}

function dateOnly(value) {
    if (!value) {
        return null;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
        return match[0];
    }
    return null;
}

function evaluateScholarship(profile, scholarship, today = new Date().toISOString().slice(0, 10)) {
    const eliminatedBy = [];
    let score = 50;

    // Missing student numbers use the least favorable value for matching.
    function studentNumber(field) {
        const value = numberOrNull(profile[field]);
        if (value !== null) {
            return value;
        }
        if (field === "income") {
            return 200000;
        }
        return 0;
    }

    function addPoints(points) {
        score += points;
    }

    function checkMinimum(scholarshipField, studentField, label) {
        const minimum = numberOrNull(scholarship[scholarshipField]);
        if (minimum === null || minimum === 0) {
            return;
        }
        if (studentNumber(studentField) < minimum) {
            eliminatedBy.push(`${label} does not meet the published minimum of ${minimum}.`);
        }
    }

    function checkMaximum(scholarshipField, studentField, label) {
        const maximum = numberOrNull(scholarship[scholarshipField]);
        if (maximum === null || maximum === 0) {
            return;
        }
        if (studentNumber(studentField) > maximum) {
            eliminatedBy.push(`${label} does not meet the published maximum of ${maximum}.`);
        }
    }

    // First check requirements that can make a student ineligible.
    checkMinimum("min_gpa", "gpa", "GPA");
    checkMinimum("min_income", "income", "household income");
    checkMaximum("max_income", "income", "household income");

    const satMinimum = numberOrNull(scholarship.min_sat);
    const actMinimum = numberOrNull(scholarship.min_act);
    const sat = studentNumber("sat");
    const act = studentNumber("act");
    const hasSatRule = satMinimum !== null && satMinimum > 0;
    const hasActRule = actMinimum !== null && actMinimum > 0;

    // A scholarship with both thresholds accepts a qualifying SAT or ACT.
    if (hasSatRule && hasActRule) {
        if (sat < satMinimum && act < actMinimum) {
            eliminatedBy.push(`Test score does not meet either the ${satMinimum} SAT or ${actMinimum} ACT requirement.`);
        }
    } else if (hasSatRule) {
        checkMinimum("min_sat", "sat", "SAT");
    } else if (hasActRule) {
        checkMinimum("min_act", "act", "ACT");
    }

    const research = scholarship.research;
    const currentResearch = research && !research.stale;
    if (currentResearch) {
        const closingDate = dateOnly(research.closes_on || scholarship.deadline);
        if (research.cycle_status === "closed" || (closingDate && closingDate < today)) {
            eliminatedBy.push("The published application cycle is closed.");
        }
    } else if (!research) {
        const deadline = dateOnly(scholarship.deadline);
        if (deadline && deadline < today) {
            eliminatedBy.push("The published deadline has passed.");
        }
    }

    const researchRules = currentResearch ? research.rules || {} : {};

    function checkResearchOptions(studentField, allowedOptions, label) {
        if (!Array.isArray(allowedOptions) || allowedOptions.length === 0) {
            return;
        }
        const studentValue = profile[studentField];
        let matches = false;
        for (const option of allowedOptions) {
            if (studentValue && sameValue(option, studentValue)) {
                matches = true;
                break;
            }
        }
        if (!matches) {
            eliminatedBy.push(`${label} is outside the published eligible options.`);
        }
    }

    checkResearchOptions("residency", researchRules.states, "residency");
    checkResearchOptions("citizenship", researchRules.citizenship, "citizenship");

    function checkIdentityRequirement(scholarshipField, studentField, label, points) {
        const requirement = scholarship[scholarshipField];
        if (isUnrestricted(requirement)) {
            return;
        }
        const studentValue = profile[studentField];
        if (!studentValue || !sameValue(requirement, studentValue)) {
            eliminatedBy.push(`${label} does not match the published requirement.`);
        } else {
            addPoints(points);
        }
    }

    // Current research options take precedence over the single database value.
    if (!Array.isArray(researchRules.citizenship)) {
        checkIdentityRequirement("citizenship", "citizenship", "citizenship", 4);
    }
    if (!Array.isArray(researchRules.states)) {
        checkIdentityRequirement("state", "residency", "residency", 8);
    }
    checkIdentityRequirement("major", "major", "major", 14);
    checkIdentityRequirement("race", "race", "race or ethnicity", 4);

    if (booleanOrNull(scholarship.requires_essay) === true) {
        if (booleanOrNull(profile.willing_essay) !== true) {
            eliminatedBy.push("The scholarship requires essay willingness.");
        } else {
            addPoints(6);
        }
    }
    if (booleanOrNull(scholarship.first_gen_only) === true) {
        if (booleanOrNull(profile.first_gen) !== true) {
            eliminatedBy.push("The scholarship requires first-generation status.");
        } else {
            addPoints(12);
        }
    }

    function checkAchievement(field, label, positivePoints, negativePoints) {
        const preference = scholarship[field];
        if (!preference || preference === "not_considered") {
            return;
        }
        const studentHasAchievement = booleanOrNull(profile[field]);
        if (preference === "required") {
            if (studentHasAchievement !== true) {
                eliminatedBy.push(`The scholarship requires ${label}.`);
            } else {
                addPoints(positivePoints);
            }
        } else if (preference === "preferred") {
            if (studentHasAchievement === true) {
                addPoints(positivePoints);
            } else {
                addPoints(negativePoints);
            }
        }
    }

    checkAchievement("leadership", "leadership", 22, -16);
    checkAchievement("award", "awards", 20, -14);

    // The remaining factors change the ranking of eligible scholarships.
    if (booleanOrNull(scholarship.advanced_coursework_preferred) === true) {
        const hasAdvancedCoursework =
            booleanOrNull(profile.has_ap) === true ||
            booleanOrNull(profile.has_honors) === true ||
            booleanOrNull(profile.has_dual_enrollment) === true;
        if (hasAdvancedCoursework) {
            addPoints(18);
        } else {
            addPoints(-12);
        }
    }

    const gpa = studentNumber("gpa");
    const gpaMinimum = numberOrNull(scholarship.min_gpa);
    if (gpaMinimum !== null && gpaMinimum > 0 && gpa >= gpaMinimum) {
        const gpaPoints = 16 + Math.round((gpa - gpaMinimum) * 14);
        addPoints(Math.min(30, gpaPoints));
    } else if (scholarship.type === "pure_merit_based") {
        const academicPoints = Math.round((gpa - 2.5) * 16);
        addPoints(Math.max(-18, Math.min(24, academicPoints)));
    }

    let bestTestPoints = null;
    if (hasSatRule && sat >= satMinimum) {
        bestTestPoints = Math.min(25, 14 + Math.floor((sat - satMinimum) / 25));
    }
    if (hasActRule && act >= actMinimum) {
        const actPoints = Math.min(25, 14 + Math.floor(act - actMinimum));
        if (bestTestPoints === null || actPoints > bestTestPoints) {
            bestTestPoints = actPoints;
        }
    }
    if (bestTestPoints !== null) {
        addPoints(bestTestPoints);
    }

    if (scholarship.type === "pure_need_based" || scholarship.type === "merit_plus_need") {
        const income = studentNumber("income");
        let needPoints;
        if (income <= 30000) {
            needPoints = 24;
        } else if (income <= 60000) {
            needPoints = 18;
        } else if (income <= 100000) {
            needPoints = 10;
        } else if (income <= 150000) {
            needPoints = 2;
        } else {
            needPoints = -18;
        }
        addPoints(needPoints);
    }

    let awardAmount = numberOrNull(scholarship.max_amount);
    if (awardAmount === null) {
        awardAmount = numberOrNull(scholarship.min_amount);
    }
    if (awardAmount && awardAmount > 0) {
        const awardPoints = Math.round(Math.log10(awardAmount) * 5 - 8);
        addPoints(Math.min(18, Math.max(3, awardPoints)));
    }
    if (booleanOrNull(scholarship.renewable) === true) {
        addPoints(10);
    }

    const eligible = eliminatedBy.length === 0;
    return {
        eligible: eligible,
        score: Math.max(0, Math.round(score)),
        match_status: eligible ? "eligible" : "ineligible",
        confirmation_needed: [],
        eliminated_by: [...new Set(eliminatedBy)]
    };
}

module.exports = { booleanOrNull, evaluateScholarship, isUnrestricted, numberOrNull };
