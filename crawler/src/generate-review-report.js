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

function countFallbacks(record) {
  return Object.values(record.field_sources || {}).filter((source) => source === "fallback").length;
}

function getSuspiciousFlags(record) {
  const flags = [];

  if (record.extraction_status !== "extracted") {
    flags.push(`Extraction status is \`${record.extraction_status}\`.`);
  }

  if (countFallbacks(record) >= 5) {
    flags.push(`Many fields use fallback values (${countFallbacks(record)} fields).`);
  }

  if (!record.min_amount && !record.max_amount) {
    flags.push("Award amount is missing or fallback `0`.");
  }

  if (record.max_amount > 250000) {
    flags.push(`Award amount looks too high for one student: \`${record.max_amount}\`.`);
  }

  if (record.min_amount > record.max_amount) {
    flags.push("Minimum amount is greater than maximum amount.");
  }

  if (record.deadline === "TBD - next cycle") {
    flags.push("Deadline needs manual verification.");
  }

  if (record.apply_url === record.source_url) {
    flags.push("Apply URL is the same as source URL; confirm this is the real application page.");
  }

  if (record.requires_essay === 0 && /essay|personal statement|written response/i.test(record.source_text || "")) {
    flags.push("Source mentions essay/writing, but `requires_essay` is `0`.");
  }

  if (record.race && record.race !== "No Restriction" && record.race !== "any") {
    flags.push(`Race restriction detected as \`${record.race}\`; confirm with official eligibility text.`);
  }

  if (record.major && record.major !== "No Restriction" && record.major !== "any") {
    flags.push(`Major restriction detected as \`${record.major}\`; confirm with official eligibility text.`);
  }

  return flags;
}

function getReviewStatus(record) {
  const suspiciousFlags = getSuspiciousFlags(record);
  if (record.extraction_status !== "extracted") return "Needs Review";
  if (suspiciousFlags.length >= 3) return "Needs Review";
  if (suspiciousFlags.length > 0) return "Check";
  return "Looks OK";
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
    `**Source URL:** ${record.source_url || "Unknown"}`,
    `**Apply URL:** ${record.apply_url || "Unknown"}`,
    "",
    "### Fields",
    "",
    renderFieldTable(record),
    "",
    "### Suspicious / Needs Check",
    "",
    suspiciousFlags.length ? suspiciousFlags.map((flag) => `- ${flag}`).join("\n") : "- None flagged by automated review.",
    "",
    "### Fallback / Inference Notes",
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
    `- Looks OK: ${statusCounts["Looks OK"] || 0}`,
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
