const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { collectScholarshipClues } = require("../src/extractors");
const { fillScholarshipFallbacks } = require("../src/inference");
const { renderRecord } = require("../src/generate-review-report");
const { extractStaticPageData } = require("../src/run-scholarship-crawler");
const { attachValidation } = require("../src/validation");

const FIXTURES = path.join(__dirname, "fixtures");

function extractFixture(fileName, seedName = "Fixture Scholarship") {
  const html = fs.readFileSync(path.join(FIXTURES, fileName), "utf8");
  const request = { url: "https://example.org/scholarship", userData: { seedName, crawlIndex: 0 } };
  const pageData = extractStaticPageData(html, request, request.url);
  return collectScholarshipClues(pageData);
}

test("extracts supported eligibility values with exact production categories and evidence", () => {
  const record = extractFixture("required-eligibility.html", "Future Engineer Scholarship");

  assert.equal(record.citizenship, "U.S. Citizen");
  assert.equal(record.state, "TX");
  assert.equal(record.major, "Computer Science");
  assert.equal(record.min_gpa, 3.5);
  assert.equal(record.min_sat, 1200);
  assert.equal(record.min_act, 26);
  assert.equal(record.requires_essay, 1);
  assert.equal(record.first_gen_only, 1);
  assert.equal(record.leadership, "preferred");
  assert.equal(record.max_income, 75000);
  assert.equal(record.renewable, 1);
  assert.equal(record.advanced_coursework_preferred, 1);
  assert.equal(record.type, "merit_plus_need");
  assert.equal(record.apply_url, "https://example.org/apply-now");
  assert.match(record.field_evidence.requires_essay[0].excerpt, /must submit an essay/i);
});

test("handles negation instead of treating keyword presence as a requirement", () => {
  const record = extractFixture("negated-requirements.html");

  assert.equal(record.citizenship, "International Student");
  assert.equal(record.requires_essay, 0);
  assert.equal(record.leadership, null);
  assert.equal(record.award, "not_considered");
  assert.equal(record.renewable, 0);
});

test("does not create hard filters from addresses, multiple majors, or historical prose", () => {
  const record = extractFixture("ambiguous-page.html");

  assert.equal(record.state, null);
  assert.equal(record.major, null);
  assert.equal(record.requires_essay, null);
  assert.equal(record.leadership, null);
  assert.equal(record.max_amount, null);
  assert.match(record.field_evidence.major[0].excerpt, /Computer Science or Engineering/i);
});

test("unresolved values stay explicit and block import", () => {
  const extracted = extractFixture("ambiguous-page.html");
  const record = attachValidation(fillScholarshipFallbacks(extracted));

  assert.equal(record.min_gpa, null);
  assert.equal(record.field_sources.min_gpa, "unresolved");
  assert.equal(record.import_ready, false);
  assert.ok(record.validation.errors.some((error) => error.includes("min_gpa is unresolved")));
});

test("review report includes import gating and exact evidence excerpts", () => {
  const record = attachValidation(fillScholarshipFallbacks(extractFixture("required-eligibility.html")));
  const markdown = renderRecord(record, 0);

  assert.match(markdown, /\*\*Import Ready:\*\* No/);
  assert.match(markdown, /Applicants must submit an essay with the application\./);
  assert.match(markdown, /Unresolved fields block import/);
});
