const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  CITIZENSHIP_VALUES,
  MAJOR_VALUES,
  RACE_VALUES,
  REQUIREMENT_VALUES,
  SCHOLARSHIP_TYPE_VALUES,
  STATE_NAMES
} = require("../src/categories");
const { validateStagedScholarship } = require("../src/validation");

const ROOT = path.resolve(__dirname, "..", "..");

function selectValues(fileName, id) {
  const html = fs.readFileSync(path.join(ROOT, fileName), "utf8");
  const select = html.match(new RegExp(`<select[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/select>`, "i"));
  assert.ok(select, `${fileName} must contain #${id}`);

  return [...select[1].matchAll(/<option(?:\s+value=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => match[1] === undefined ? match[2].replace(/<[^>]+>/g, "").trim() : match[1])
    .filter(Boolean);
}

function sorted(values) {
  return [...values].sort();
}

function enumValues(tableSql, field) {
  const match = tableSql.match(new RegExp(`\\\`${field}\\\` enum\\(([\\s\\S]*?)\\) DEFAULT`, "i"));
  assert.ok(match, `SQL must define enum ${field}`);
  return [...match[1].matchAll(/'([^']*)'/g)].map((value) => value[1]);
}

test("all frontend state selectors use the canonical state and territory codes", () => {
  const expected = sorted(Object.keys(STATE_NAMES));
  for (const file of ["high-school-scholarship-matching.html", "admin.html", "submit-scholarship.html"]) {
    assert.deepEqual(sorted(selectValues(file, file.includes("high-school") ? "residency" : "state")), expected, file);
  }
});

test("scholarship forms use canonical category values", () => {
  for (const file of ["admin.html", "submit-scholarship.html"]) {
    assert.deepEqual(selectValues(file, "citizenship"), CITIZENSHIP_VALUES, `${file} citizenship`);
    assert.deepEqual(selectValues(file, "major"), MAJOR_VALUES, `${file} majors`);
    assert.deepEqual(selectValues(file, "leadership"), REQUIREMENT_VALUES, `${file} leadership`);
    assert.deepEqual(selectValues(file, "award"), REQUIREMENT_VALUES, `${file} award`);
    assert.deepEqual(selectValues(file, "race"), RACE_VALUES, `${file} race`);
    assert.deepEqual(selectValues(file, "type"), SCHOLARSHIP_TYPE_VALUES, `${file} type`);
  }

  assert.deepEqual(selectValues("high-school-scholarship-matching.html", "citizenship"), CITIZENSHIP_VALUES.slice(1));
  assert.deepEqual(selectValues("high-school-scholarship-matching.html", "major"), MAJOR_VALUES);
  assert.deepEqual(selectValues("high-school-scholarship-matching.html", "race"), RACE_VALUES);
});

test("SQL enum wording matches canonical crawler and frontend wording", () => {
  const sql = fs.readFileSync(path.join(ROOT, "scholarmatch-production.sql"), "utf8");
  const scholarshipTable = sql.match(/CREATE TABLE `scholarships` \(([\s\S]*?)\n\) ENGINE=/)[1];
  assert.deepEqual(enumValues(scholarshipTable, "citizenship"), CITIZENSHIP_VALUES);
  assert.deepEqual(enumValues(scholarshipTable, "leadership"), ["required", "preferred", "not_considered"]);
  assert.deepEqual(enumValues(scholarshipTable, "award"), ["required", "preferred", "not_considered"]);
  assert.deepEqual(enumValues(scholarshipTable, "race"), RACE_VALUES);
  assert.deepEqual(enumValues(scholarshipTable, "type"), SCHOLARSHIP_TYPE_VALUES);
});

test("validator rejects display labels and non-canonical aliases", () => {
  const base = {
    name: "Test", provider: "Provider", min_gpa: 0, min_sat: 0, min_act: 0,
    citizenship: "No Restriction", requires_essay: 0, renewable: 0,
    deadline: "TBD - next cycle", advanced_coursework_preferred: 0,
    apply_url: "https://example.org/apply", leadership: "not_considered",
    award: "not_considered", type: "pure_merit_based", extraction_status: "extracted"
  };

  assert.equal(validateStagedScholarship({ ...base, type: "Pure Merit" }).is_valid, false);
  assert.equal(validateStagedScholarship({ ...base, leadership: "Preferred" }).is_valid, false);
  assert.equal(validateStagedScholarship({ ...base, major: "Computer science" }).is_valid, false);
});
