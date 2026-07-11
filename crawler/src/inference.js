const FALLBACKS = {
  min_amount: 0,
  max_amount: 0,
  min_gpa: 0,
  min_sat: 0,
  min_act: 0,
  citizenship: "No Restriction",
  state: "No Restriction",
  major: "No Restriction",
  requires_essay: 0,
  first_gen_only: 0,
  leadership: 0,
  min_income: 0,
  max_income: 0,
  renewable: 0,
  description: "No description extracted",
  apply_url: "No apply URL found",
  deadline: "TBD - next cycle",
  advanced_coursework_preferred: 0,
  award: 0,
  race: "No Restriction",
  type: "pure_merit_based"
};

function fillScholarshipFallbacks(record) {
  const field_sources = {};
  const inference_notes = [];
  const filled = { ...record };

  for (const [field, fallback] of Object.entries(FALLBACKS)) {
    const value = filled[field];
    if (value === null || value === undefined || value === "") {
      filled[field] = fallback;
      field_sources[field] = "fallback";
      inference_notes.push(`${field} was missing and filled with fallback value ${JSON.stringify(fallback)}.`);
    } else {
      field_sources[field] = "direct_or_extracted";
    }
  }

  if (!filled.apply_url || filled.apply_url === "No apply URL found") {
    filled.apply_url = filled.source_url;
    field_sources.apply_url = "derived";
    inference_notes.push("apply_url was derived from source_url.");
  }

  const fallbackCount = Object.values(field_sources).filter((source) => source === "fallback").length;
  filled.confidence = fallbackCount > 8 ? "low" : filled.confidence || "medium";
  filled.value_source = fallbackCount ? "mixed" : "direct_or_extracted";
  filled.field_sources = field_sources;
  filled.inference_notes = inference_notes;

  return filled;
}

function buildEmptyWinnerBackground(sourceRecord) {
  return {
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
