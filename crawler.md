# ScholarMatch Crawler Plan

## Summary

This document is the working plan for a ScholarMatch scholarship crawler.

The crawler should collect public scholarship information and public winner-background information, then store results in a staging format for review before anything affects live matching. The recommended stack is **Crawlee + Playwright** because the current site is Node/Express and many scholarship pages require browser rendering.

## Key Changes

- Use **Crawlee** for queues, retries, concurrency, request routing, and crawl limits.
- Use **Playwright** when pages need JavaScript rendering.
- Crawl multiple websites concurrently **when allowed by robots.txt, site terms, and rate limits**.
- Use per-domain throttling so one website is not overloaded.
- Save extracted records to staging output first, not directly into production scholarship tables.
- Skip scholarships that already exist in ScholarMatch before crawling them.
- Extract eligibility fields only from requirement-oriented text and retain the exact supporting excerpt for review.
- Keep a missing or ambiguous fact as `null`; do not turn absence of evidence into `0`, `No Restriction`, or another production-looking value.
- Validate staged records against canonical frontend values, MySQL enums, primitive types, ranges, URL protocols, and field lengths.
- Mark every record with `validation`, `review_status`, and `import_ready`. Any unresolved field or validation warning prevents automatic import readiness.

## Crawling Workflow

- Start with 5-10 official scholarship URLs.
- Compare seed URLs against existing ScholarMatch scholarships before crawling:
  - `crawler/seeds/known-existing-scholarships.json` for manually confirmed existing scholarships;
  - `scholarmatch-production.sql` for the current SQL snapshot;
  - the live MySQL `scholarships` table when `.env` database settings are available.
- Skip seed URLs that match an existing scholarship by name, near-name, or apply URL.
- Group URLs by domain.
- Check whether crawling is allowed for each domain.
- Crawl several domains concurrently when allowed.
- Keep concurrency conservative at first:
  - global concurrency: `3-5` pages at a time;
  - request starts for the same domain spaced by `2-5` seconds;
  - do not assume spacing request starts guarantees only one long-running request per domain.
- Extract readable page text, metadata, headings, tables, deadlines, award amounts, eligibility rules, and application links.
- Normalize extracted data into ScholarMatch fields.
- Annotate unresolved fields without inventing fallback facts.
- Validate each staged record before writing output.
- Save results to `crawler/output/scholarships-staging.json`.
- Save skipped duplicate seeds to `crawler/output/skipped-existing-scholarships.json`.
- Manually review staged results before database import.
- Keep database insertion disabled. `import_ready` is a review aid, not permission for the crawler to write to MySQL.

## Scholarship Fields To Extract

Scholarship records should map toward the current ScholarMatch scholarship data model:

- `name`
- `provider`
- `min_amount`
- `max_amount`
- `min_gpa`
- `min_sat`
- `min_act`
- `citizenship`
- `state`
- `major`
- `requires_essay`
- `first_gen_only`
- `leadership`
- `min_income`
- `max_income`
- `renewable`
- `description`
- `apply_url`
- `deadline`
- `advanced_coursework_preferred`
- `award`
- `race`
- `type`
- `source_url`
- `source_text`
- `last_verified`
- `confidence`
- `extraction_status`
- `field_evidence`
- `field_sources`
- `unresolved_fields`
- `validation`
- `review_status`
- `import_ready`

## Winner Background Fields

Winner-background data should include every category that appears in the student matching form so ScholarMatch can improve matching accuracy over time.

Suggested fields:

- `scholarship_name`
- `scholarship_provider`
- `winner_name`
- `winner_year`
- `winner_school`
- `winner_state`
- `gpa`
- `sat`
- `act`
- `citizenship`
- `residency`
- `gender`
- `race`
- `major`
- `has_ap`
- `ap_count`
- `ap_high_scores`
- `has_honors`
- `honors_count`
- `has_dual_enrollment`
- `dual_enrollment_count`
- `first_gen`
- `leadership`
- `income`
- `household_size`
- `award`
- `willing_essay`
- `essay_written`
- `financial_background_summary`
- `academic_background_summary`
- `extracurricular_summary`
- `evidence_text`
- `source_url`
- `source_type`
- `value_source`
- `confidence`
- `review_status`

`value_source` and `field_sources` identify how fields were established:

- `direct`: clearly stated by the source.
- `derived`: calculated from nearby source facts.
- `domain_derived`: provider name was derived from the source hostname and still needs confirmation.
- `extracted_with_evidence`: value has a captured supporting excerpt.
- `unresolved`: the page did not establish a safe value; the staged value remains `null`.

## Inference Rules

- Prefer direct source evidence over inference.
- If eligibility text says an essay is required, set `requires_essay = 1` and retain that sentence. If it explicitly says no essay is required, set it to `0` with the negating sentence.
- If a winner biography mentions an essay, personal statement, writing contest, or application essay, set `essay_written = 1`.
- If a winner has published leadership roles, set `leadership = 1`.
- If a winner has state, national, international, major academic, athletic, civic, research, or arts awards, set `award = 1`.
- For scholarship restrictions, do not infer AP, honors, dual enrollment, race, income, citizenship, state, major, first-generation status, GPA, SAT, or ACT from general prose.
- If a page supports multiple states, majors, races, or citizenship categories that the current database cannot represent in one field, keep the field unresolved and show all relevant excerpts.
- State extraction supports all U.S. states, the District of Columbia, and U.S. territories, but only inside eligibility-related sentences.
- Crawler outputs for `leadership` and `award` must be exactly `required`, `preferred`, `not_considered`, or unresolved.
- Crawler outputs for `type`, citizenship, race, major, and state must use the exact canonical values in `crawler/src/categories.js`.

## V1 Implementation Plan

- The current V1 has a `crawler/` folder with:
  - `crawler/seeds/scholarships.json` seed URL list;
  - `crawler/seeds/known-existing-scholarships.json` manually maintained list of scholarships already on the site;
  - `crawler/src/run-scholarship-crawler.js` crawler runner;
  - `crawler/src/extractors.js` extraction helpers;
  - `crawler/src/categories.js` canonical machine values shared by extraction and validation;
  - `crawler/src/inference.js` unresolved-field and provenance annotation helpers;
  - `crawler/src/validation.js` staging schema, enum, range, and import-readiness validation;
  - `crawler/src/generate-review-report.js` evidence-rich manual review report generator;
  - `crawler/test/` saved HTML fixtures and Node test coverage;
  - ignored `crawler/output/` staging output folder.
- The first version is file-output based:
  - `crawler/output/scholarships-staging.json`
  - `crawler/output/winner-background-staging.json`
  - `crawler/output/skipped-existing-scholarships.json`
- Do not insert into MySQL automatically in V1.
- Add a later review/import script after output quality is proven.
- Keep official scholarship pages as the first target source.
- Add winner-background crawling after the scholarship extraction flow is stable.

Run commands:

```bash
npm run crawl:scholarships:dry-run
npm run crawl:scholarships:static
npm run crawl:scholarships
npm run crawl:scholarships:review
npm test
```

Use `crawl:scholarships:static` for static HTML pages. Use `crawl:scholarships` for browser-rendered pages; it defaults to Playwright's bundled Chromium. Set `CRAWLER_BROWSER_CHANNEL=chrome` only when you want to force the installed Google Chrome channel for local debugging.

Static requests enforce status checks, HTML content-type checks, a 20-second default timeout, and a 3 MB default response limit. Browser and static extraction retain at most 200,000 readable characters per page. Override these cautiously with `CRAWLER_PAGE_TIMEOUT_MS`, `CRAWLER_MAX_RESPONSE_BYTES`, or `CRAWLER_MAX_PAGE_TEXT_CHARACTERS`.

## Test Plan

- Test with 5 official scholarship URLs first.
- Include at least one static page and one JavaScript-rendered page.
- Confirm concurrent crawling works across multiple domains.
- Confirm per-domain throttling prevents too many requests to one site.
- Verify extracted scholarship fields against source pages.
- Verify unresolved values remain `null` and block `import_ready`.
- Verify canonical categories match the profile form, scholarship forms, crawler, and SQL enums.
- Verify negated requirements and ambiguous multi-category pages do not become hard filters.
- Verify every extracted restrictive value includes a supporting excerpt.
- Manually review winner-background data before using it to adjust matching logic.

## Assumptions

- `GPT` in the earlier question means `GPA`.
- Crawlee + Playwright is the default crawler stack.
- The crawler should improve matching accuracy, but staged data should be reviewed before production use.
- Concurrent crawling is allowed only when the target website permits it.
- Missing or ambiguous scholarship values should remain unresolved until a human verifies them from an authoritative source.
