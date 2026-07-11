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
- Use reasoning-based inference when fields are missing, but store whether a value is directly sourced or inferred.
- Try to make every important category field non-empty by using one of:
  - direct source value;
  - clear derived value;
  - reasonable inference;
  - explicit fallback such as `Unknown`, `No Evidence Found`, `No Restriction`, or `TBD - next cycle`.

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
  - per-domain concurrency: `1` page at a time;
  - delay between requests to the same domain: `2-5` seconds.
- Extract readable page text, metadata, headings, tables, deadlines, award amounts, eligibility rules, and application links.
- Normalize extracted data into ScholarMatch fields.
- Run an inference step for missing fields.
- Save results to `crawler/output/scholarships-staging.json`.
- Save skipped duplicate seeds to `crawler/output/skipped-existing-scholarships.json`.
- Manually review staged results before database import.
- Add database insertion only after extraction accuracy is reliable.

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

`value_source` should identify how the field was filled:

- `direct`: clearly stated by the source.
- `derived`: calculated from nearby source facts.
- `inferred`: reasoned estimate from public context.
- `fallback`: no strong evidence, filled with a default non-empty value.

## Inference Rules

- Prefer direct source evidence over inference.
- If a scholarship says an essay is required, set `requires_essay = 1`.
- If a winner biography mentions an essay, personal statement, writing contest, or application essay, set `essay_written = 1`.
- If a winner has published leadership roles, set `leadership = 1`.
- If a winner has state, national, international, major academic, athletic, civic, research, or arts awards, set `award = 1`.
- If AP, honors, or dual enrollment are not stated, infer cautiously from school profile, academic rigor language, or advanced coursework mentions.
- If exact AP count or AP high-score count is unavailable, use a reasoned estimate and mark `value_source = inferred`.
- If race, income, gender, citizenship, or first-generation status are not stated, do not invent a precise identity. Use `Unknown` or `No Evidence Found`.
- If GPA, SAT, or ACT are not stated, estimate only when strong contextual evidence exists, and mark the field as inferred.
- Every inferred field should include a short explanation in `evidence_text` or a future `inference_reason` field.

## V1 Implementation Plan

- The current V1 has a `crawler/` folder with:
  - `crawler/seeds/scholarships.json` seed URL list;
  - `crawler/seeds/known-existing-scholarships.json` manually maintained list of scholarships already on the site;
  - `crawler/src/run-scholarship-crawler.js` crawler runner;
  - `crawler/src/extractors.js` extraction helpers;
  - `crawler/src/inference.js` fallback and inference helpers;
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
```

Use `crawl:scholarships:static` for static HTML pages. Use `crawl:scholarships` for browser-rendered pages; it defaults to Playwright's bundled Chromium. Set `CRAWLER_BROWSER_CHANNEL=chrome` only when you want to force the installed Google Chrome channel for local debugging.

## Test Plan

- Test with 5 official scholarship URLs first.
- Include at least one static page and one JavaScript-rendered page.
- Confirm concurrent crawling works across multiple domains.
- Confirm per-domain throttling prevents too many requests to one site.
- Verify extracted scholarship fields against source pages.
- Verify every staged record has non-empty required fields or explicit fallback values.
- Check that inferred values are marked as inferred.
- Manually review winner-background data before using it to adjust matching logic.

## Assumptions

- `GPT` in the earlier question means `GPA`.
- Crawlee + Playwright is the default crawler stack.
- The crawler should improve matching accuracy, but staged data should be reviewed before production use.
- Concurrent crawling is allowed only when the target website permits it.
- Missing values should be filled as much as possible through evidence, reasoning, or explicit fallback labels.
