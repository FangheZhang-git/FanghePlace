const {
  CITIZENSHIP_VALUES,
  MAJOR_VALUES,
  RACE_VALUES,
  REQUIREMENT_VALUES,
  SCHOLARSHIP_TYPE_VALUES,
  STATE_NAMES
} = require("./categories");

const BOOLEAN_FIELDS = [
  "requires_essay",
  "first_gen_only",
  "renewable",
  "advanced_coursework_preferred"
];

const NUMBER_RANGES = {
  min_amount: [0, 10000000],
  max_amount: [0, 10000000],
  min_gpa: [0, 4],
  min_sat: [0, 1600],
  min_act: [0, 36],
  min_income: [0, 10000000],
  max_income: [0, 10000000]
};

const ENUMS = {
  citizenship: CITIZENSHIP_VALUES,
  leadership: REQUIREMENT_VALUES,
  award: REQUIREMENT_VALUES,
  race: RACE_VALUES,
  type: SCHOLARSHIP_TYPE_VALUES
};

const REQUIRED_IMPORT_FIELDS = [
  "name",
  "provider",
  "min_gpa",
  "min_sat",
  "min_act",
  "citizenship",
  "requires_essay",
  "renewable",
  "deadline",
  "advanced_coursework_preferred",
  "apply_url",
  "leadership",
  "award",
  "type"
];

function isMissing(value) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function isHttpUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function validateStagedScholarship(record) {
  const errors = [];
  const warnings = [];

  for (const field of REQUIRED_IMPORT_FIELDS) {
    if (isMissing(record[field])) {
      errors.push(`${field} is unresolved and must be verified before import.`);
    }
  }

  const unresolvedFields = Array.isArray(record.unresolved_fields) ? record.unresolved_fields : [];
  if (unresolvedFields.length) {
    errors.push(`Unresolved fields block import: ${unresolvedFields.join(", ")}.`);
  }

  if (!isMissing(record.name) && (typeof record.name !== "string" || record.name.length > 255)) {
    errors.push("name must be a string no longer than 255 characters.");
  }

  if (!isMissing(record.provider) && (typeof record.provider !== "string" || record.provider.length > 255)) {
    errors.push("provider must be a string no longer than 255 characters.");
  }

  for (const [field, [minimum, maximum]] of Object.entries(NUMBER_RANGES)) {
    const value = record[field];
    if (isMissing(value)) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
      errors.push(`${field} must be a number between ${minimum} and ${maximum}.`);
    }
  }

  if (!isMissing(record.min_amount) && !isMissing(record.max_amount) && record.min_amount > record.max_amount) {
    errors.push("min_amount cannot exceed max_amount.");
  }

  if (!isMissing(record.min_income) && !isMissing(record.max_income) && record.min_income > record.max_income) {
    errors.push("min_income cannot exceed max_income.");
  }

  for (const field of BOOLEAN_FIELDS) {
    if (!isMissing(record[field]) && record[field] !== 0 && record[field] !== 1) {
      errors.push(`${field} must be 0 or 1.`);
    }
  }

  for (const [field, allowed] of Object.entries(ENUMS)) {
    if (!isMissing(record[field]) && !allowed.includes(record[field])) {
      errors.push(`${field} must be one of: ${allowed.join(", ")}.`);
    }
  }

  if (!isMissing(record.state) && !Object.hasOwn(STATE_NAMES, record.state)) {
    errors.push(`state must use a canonical frontend code: ${Object.keys(STATE_NAMES).join(", ")}.`);
  }

  if (!isMissing(record.major) && !MAJOR_VALUES.includes(record.major)) {
    errors.push(`major must match a frontend category: ${MAJOR_VALUES.join(", ")}.`);
  }

  if (!isMissing(record.deadline) && (typeof record.deadline !== "string" || record.deadline.length > 50)) {
    errors.push("deadline must be a string no longer than 50 characters.");
  }

  if (!isMissing(record.description) && typeof record.description !== "string") {
    errors.push("description must be a string.");
  }

  if (!isMissing(record.apply_url) && (!isHttpUrl(record.apply_url) || record.apply_url.length > 500)) {
    errors.push("apply_url must be an http(s) URL no longer than 500 characters.");
  }

  if (!isMissing(record.source_url) && !isHttpUrl(record.source_url)) {
    warnings.push("source_url is not a valid http(s) URL.");
  }

  if (record.apply_url && record.apply_url === record.source_url) {
    warnings.push("apply_url is the source page; confirm it is the actual application destination.");
  }

  if (record.field_sources?.provider === "domain_derived") {
    warnings.push("provider was derived from the source domain and requires confirmation.");
  }

  if (record.extraction_status !== "extracted" && record.extraction_status !== "extracted_with_static_fallback") {
    errors.push(`extraction_status is ${record.extraction_status || "missing"}.`);
  }

  const evidence = record.field_evidence || {};
  for (const field of ["citizenship", "state", "major", "requires_essay", "first_gen_only", "leadership", "min_income", "max_income", "race"]) {
    if (!isMissing(record[field]) && !evidence[field]?.length && record.field_sources?.[field] !== "manual") {
      warnings.push(`${field} has no supporting excerpt.`);
    }
  }

  return {
    is_valid: errors.length === 0,
    import_ready: errors.length === 0 && warnings.length === 0,
    errors,
    warnings
  };
}

function attachValidation(record) {
  const validation = validateStagedScholarship(record);
  return {
    ...record,
    validation,
    import_ready: validation.import_ready,
    review_status: validation.errors.length ? "needs_review" : validation.warnings.length ? "check" : "ready"
  };
}

module.exports = {
  BOOLEAN_FIELDS,
  ENUMS,
  REQUIRED_IMPORT_FIELDS,
  attachValidation,
  isHttpUrl,
  isMissing,
  validateStagedScholarship
};
