const fs = require("fs/promises");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const INPUT_PATH = path.join(PROJECT_ROOT, "crawler", "output", "scholarships-staging.json");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "crawler", "output", "scholarships-review.md");

const REVIEW_FIELDS = [
  "min_amount",
  "max_amount",
  "min_gpa",
  "min_sat",
  "min_act",
  "citizenship",
  "state",
  "major",
  "requires_essay",
  "first_gen_only",
  "leadership",
  "min_income",
  "max_income",
  "renewable",
  "deadline",
  "advanced_coursework_preferred",
  "award",
  "race",
  "type"
];

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "`EMPTY`";
  if (typeof value === "string") return value;
  return String(value);
}

function countUnresolved(record) {
  return Object.values(record.field_sources || {}).filter((source) => source === "unresolved").length;
}

function getSuspiciousFlags(record) {
  const flags = [];

  if (record.extraction_status !== "extracted") {
    flags.push(`Extraction status is \`${record.extraction_status}\`.`);
  }

  if (countUnresolved(record) >= 5) {
    flags.push(`Many fields remain unresolved (${countUnresolved(record)} fields).`);
  }

  if (record.min_amount === null && record.max_amount === null) {
    flags.push("Award amount is unresolved.");
  }

  if (record.max_amount > 250000) {
    flags.push(`Award amount looks too high for one student: \`${record.max_amount}\`.`);
  }

  if (record.min_amount > record.max_amount) {
    flags.push("Minimum amount is greater than maximum amount.");
  }

  if (!record.deadline) {
    flags.push("Deadline is unresolved.");
  }

  if (record.apply_url === record.source_url) {
    flags.push("Apply URL is the same as source URL; confirm this is the real application page.");
  }

  if (record.requires_essay === 0 && !record.field_evidence?.requires_essay?.length && /essay|personal statement|written response/i.test(record.source_text || "")) {
    flags.push("Source mentions essay/writing, but `requires_essay` is `0`.");
  }

  if (record.state) {
    flags.push(`State restriction detected as \`${record.state}\`; confirm with official eligibility text.`);
  }

  if (record.race && record.race !== "No Restriction" && record.race !== "any") {
    flags.push(`Race restriction detected as \`${record.race}\`; confirm with official eligibility text.`);
  }

  if (record.major && record.major !== "No Restriction" && record.major !== "any") {
    flags.push(`Major restriction detected as \`${record.major}\`; confirm with official eligibility text.`);
  }

  for (const error of record.validation?.errors || []) {
    flags.push(`Validation error: ${error}`);
  }

  for (const warning of record.validation?.warnings || []) {
    flags.push(`Validation warning: ${warning}`);
  }

  return [...new Set(flags)];
}

function getReviewStatus(record) {
  if (record.import_ready) return "Ready";
  if (record.validation?.errors?.length || record.extraction_status === "failed") return "Needs Review";
  return "Check";
}

function renderFieldTable(record) {
  const lines = [
    "| Field | Value | Source |",
    "| --- | --- | --- |"
  ];

  for (const field of REVIEW_FIELDS) {
    lines.push(`| \`${field}\` | ${formatValue(record[field])} | ${record.field_sources?.[field] || "direct_or_extracted"} |`);
  }

  return lines.join("\n");
}

function renderEvidence(record) {
  const evidence = record.field_evidence || {};
  const lines = [
    "| Field | Extracted Value | Supporting Excerpt | Confidence |",
    "| --- | --- | --- | --- |"
  ];

  for (const field of REVIEW_FIELDS) {
    const entries = evidence[field] || [];
    if (!entries.length) {
      lines.push(`| \`${field}\` | ${formatValue(record[field])} | No evidence captured | - |`);
      continue;
    }

    for (const entry of entries) {
      const excerpt = String(entry.excerpt || "").replace(/\|/g, "\\|");
      lines.push(`| \`${field}\` | ${formatValue(entry.value)} | ${excerpt} | ${entry.confidence || "unknown"} |`);
    }
  }

  return lines.join("\n");
}

function renderRecord(record, index) {
  const suspiciousFlags = getSuspiciousFlags(record);
  const notes = record.inference_notes || [];
  const reviewStatus = getReviewStatus(record);

  return [
    `## ${index + 1}. ${record.name}`,
    "",
    `**Review Status:** ${reviewStatus}`,
    "",
    `**Provider:** ${record.provider || "Unknown"}`,
    `**Confidence:** ${record.confidence || "Unknown"}`,
    `**Extraction Status:** ${record.extraction_status || "Unknown"}`,
    `**Import Ready:** ${record.import_ready ? "Yes" : "No"}`,
    `**Source URL:** ${record.source_url || "Unknown"}`,
    `**Apply URL:** ${record.apply_url || "Unknown"}`,
    "",
    "### Fields",
    "",
    renderFieldTable(record),
    "",
    "### Evidence",
    "",
    renderEvidence(record),
    "",
    "### Suspicious / Needs Check",
    "",
    suspiciousFlags.length ? suspiciousFlags.map((flag) => `- ${flag}`).join("\n") : "- None flagged by automated review.",
    "",
    "### Unresolved / Inference Notes",
    "",
    notes.length ? notes.map((note) => `- ${note}`).join("\n") : "- None.",
    ""
  ].join("\n");
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const records = JSON.parse(raw);
  const statusCounts = records.reduce((counts, record) => {
    const status = getReviewStatus(record);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const content = [
    "# Scholarship Crawler Review Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Total records: ${records.length}`,
    `- Import ready: ${statusCounts.Ready || 0}`,
    `- Check: ${statusCounts.Check || 0}`,
    `- Needs Review: ${statusCounts["Needs Review"] || 0}`,
    "",
    "This report is for manual review only. Do not import these records into MySQL until the suspicious fields are checked against official sources.",
    "",
    ...records.map(renderRecord)
  ].join("\n");

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${content}\n`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  getReviewStatus,
  getSuspiciousFlags,
  renderEvidence,
  renderRecord
};
