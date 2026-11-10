const STAGED_FIELDS = [
  "min_amount", "max_amount", "min_gpa", "min_sat", "min_act",
  "citizenship", "state", "major", "requires_essay", "first_gen_only",
  "leadership", "min_income", "max_income", "renewable", "description",
  "apply_url", "deadline", "advanced_coursework_preferred", "award", "race", "type"
];

function fillScholarshipFallbacks(record) {
  const field_sources = {
    name: record.name ? "seed_or_page" : "unresolved",
    provider: record.provider ? "domain_derived" : "unresolved"
  };
  const inference_notes = [];
  const filled = { ...record };

  for (const field of STAGED_FIELDS) {
    const value = filled[field];
    if (value === null || value === undefined || value === "") {
      filled[field] = null;
      field_sources[field] = "unresolved";
      inference_notes.push(`${field} was not established by extraction and remains unresolved.`);
    } else {
      field_sources[field] = filled.field_evidence?.[field]?.length ? "extracted_with_evidence" : "derived_or_extracted";
    }
  }

  if (!filled.apply_url && filled.source_url) {
    filled.apply_url = filled.source_url;
    field_sources.apply_url = "derived";
    inference_notes.push("apply_url was derived from source_url and requires confirmation.");
  }

  const unresolved_fields = Object.entries(field_sources)
    .filter(([, source]) => source === "unresolved")
    .map(([field]) => field);
  filled.confidence = unresolved_fields.length > 8 ? "low" : filled.confidence || "medium";
  filled.value_source = unresolved_fields.length ? "mixed_with_unresolved" : "extracted";
  filled.field_sources = field_sources;
  filled.inference_notes = inference_notes;
  filled.unresolved_fields = unresolved_fields;

  return filled;
}

function buildEmptyWinnerBackground(sourceRecord) {
  return {
    crawl_index: sourceRecord.crawl_index,
    scholarship_name: sourceRecord.name,
    scholarship_provider: sourceRecord.provider,
    winner_name: "Unknown",
    winner_year: "Unknown",
    winner_school: "Unknown",
    winner_state: "Unknown",
    gpa: "Unknown",
    sat: "Unknown",
    act: "Unknown",
    citizenship: "Unknown",
    residency: "Unknown",
    gender: "Unknown",
    race: "Unknown",
    major: "Unknown",
    has_ap: "Unknown",
    ap_count: "Unknown",
    ap_high_scores: "Unknown",
    has_honors: "Unknown",
    honors_count: "Unknown",
    has_dual_enrollment: "Unknown",
    dual_enrollment_count: "Unknown",
    first_gen: "Unknown",
    leadership: "Unknown",
    income: "Unknown",
    household_size: "Unknown",
    award: "Unknown",
    willing_essay: sourceRecord.requires_essay ? 1 : "Unknown",
    essay_written: sourceRecord.requires_essay ? 1 : "Unknown",
    financial_background_summary: "No Evidence Found",
    academic_background_summary: "No Evidence Found",
    extracurricular_summary: "No Evidence Found",
    evidence_text: "No winner profile crawled in V1.",
    source_url: sourceRecord.source_url,
    source_type: "scholarship_page",
    value_source: "fallback",
    confidence: "low",
    review_status: "needs_review"
  };
}

module.exports = {
  buildEmptyWinnerBackground,
  fillScholarshipFallbacks
};
