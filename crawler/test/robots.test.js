const assert = require("node:assert/strict");
const test = require("node:test");

const { parseRobotsTxt } = require("../src/run-scholarship-crawler");

test("robots parser honors the longest allow rule", () => {
  const robots = parseRobotsTxt(`
User-agent: *
Disallow: /private/
Allow: /private/public/
  `);

  assert.equal(robots.isAllowed("https://example.org/private/data"), false);
  assert.equal(robots.isAllowed("https://example.org/private/public/page"), true);
});

test("robots parser prefers ScholarMatch-specific rules over wildcard rules", () => {
  const robots = parseRobotsTxt(`
User-agent: *
Disallow: /

User-agent: ScholarMatchCrawler
Allow: /
  `);

  assert.equal(robots.isAllowed("https://example.org/scholarship"), true);
});

test("robots parser supports wildcard and end-anchor rules", () => {
  const robots = parseRobotsTxt(`
User-agent: *
Disallow: /*?download=$
  `);

  assert.equal(robots.isAllowed("https://example.org/file?download="), false);
  assert.equal(robots.isAllowed("https://example.org/file?download=true"), true);
});
