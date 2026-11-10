# ScholarMatch Scholarship Duplicate-Check Handoff

## Objective

Complete the approval-stage duplicate audit for the proposed batch of 60 scholarships by querying the configured ScholarMatch MySQL database and inspecting the repository SQL snapshot. **Do not import scholarships or change any database, SQL snapshot, website, crawler, or research records.**

This task is read-only. Stop after reporting duplicate-check findings and wait for the user’s decision.

## Required first steps

1. Read and follow the repository’s `AGENTS.md` completely.
2. Confirm the repository is the **ScholarMatch Website** project.
3. Preserve all existing and uncommitted user work.
4. Do not expose `.env` values, database passwords, JWT secrets, or other credentials in command output or the final response.

## Background

A prior Codex reviewed 100 public scholarship candidates and recommended exactly 60 moderate opportunities. It generated these approval-stage artifacts:

- `outputs/01a07dfc-73a1-7b13-91b3-6d9978ac72fc/ScholarMatch_100_Candidate_Research_Report.pdf`
- `outputs/01a07dfc-73a1-7b13-91b3-6d9978ac72fc/ScholarMatch_100_Candidate_Research_Report.docx`
- `outputs/01a07dfc-73a1-7b13-91b3-6d9978ac72fc/ScholarMatch_100_Candidate_Review.xlsx`

The known-existing seed file was checked. Its three entries—The Gates Scholarship, Coca-Cola Scholars Program, and Elks Most Valuable Student—were rejected and are not among the proposed 60.

The previous device could not finish the authoritative duplicate check because:

- `scholarmatch-production.sql` and `.env` were macOS file-provider placeholders that timed out when read.
- MySQL Workbench was not installed or running on that device.
- No MySQL service was listening on ports 3306 or 33060.

## Proposed records to check

Treat the workbook’s **Recommended 60** sheet as the authoritative proposed list. Use its scholarship name, provider, and official source/application URL columns. Confirm that the sheet contains exactly 60 unique proposed names before comparing them.

If the workbook is unavailable on the other device, stop and ask the user to copy it there. Do not reconstruct or guess the proposed list from memory.

## Duplicate definition

Flag a proposed scholarship when any of these conditions applies:

1. Exact scholarship-name match after normalization.
2. Strong fuzzy name match that appears to describe the same program.
3. Same provider and a materially equivalent scholarship/program name.
4. Exact canonical application URL match.
5. Different URLs that canonicalize to the same application page or portal program.
6. A renamed or successor program that is substantively the same existing scholarship.

Normalization should be used only to find candidates for manual review. It must not silently declare two different provider programs identical.

Recommended name normalization:

- lowercase;
- Unicode normalization;
- trim and collapse whitespace;
- replace `&` with `and`;
- remove punctuation;
- cautiously remove generic suffixes such as `scholarship`, `award`, `program`, or `contest` only for a secondary comparison;
- preserve meaningful donor, chapter, geography, identity, trade, and student-level terms.

Recommended URL canonicalization:

- lowercase scheme and hostname;
- accept only `http` and `https`;
- remove fragments;
- remove default ports;
- remove a trailing slash where equivalent;
- remove common tracking parameters such as `utm_*`, `gclid`, and `fbclid`;
- do not assume two different paths on a shared portal are duplicates.

## SQL snapshot check

Read `scholarmatch-production.sql` without editing it. Determine the `scholarships` table’s actual column names and extract every existing scholarship’s:

- `id`
- `name`
- `provider`
- `apply_url`

Also inspect insert statements for legacy or variant representations that may not be returned by a simplistic parser. Compare all existing snapshot rows against the 60 proposals by normalized name, provider, and canonical URL.

Report:

- exact matches;
- likely/fuzzy matches requiring human judgment;
- same-provider collisions;
- canonical-URL matches;
- malformed or missing existing URLs that limited comparison.

## Live MySQL check

Use the configured database or the user’s active MySQL Workbench connection. Run **only read-only statements**, preferably within a read-only transaction when supported.

First inspect the active database and schema:

```sql
SELECT DATABASE() AS current_database;
SHOW COLUMNS FROM scholarships;
SELECT COUNT(*) AS scholarship_count FROM scholarships;
```

Then retrieve only the fields needed for comparison:

```sql
SELECT id, name, provider, apply_url
FROM scholarships
ORDER BY id;
```

If `apply_url` or another field has a different name, adapt only after confirming the schema with `SHOW COLUMNS`.

Do not run `INSERT`, `UPDATE`, `DELETE`, `REPLACE`, `ALTER`, `DROP`, `TRUNCATE`, `CREATE`, migrations, import scripts, admin API calls, or any statement that acquires a write lock or changes session/global database configuration.

Do not print credentials or the complete `.env`. Load configuration without echoing secrets.

## Comparison workflow

1. Load the 60 proposed records from the workbook.
2. Load all existing snapshot scholarship identifiers.
3. Load all live-database scholarship identifiers with the read-only query.
4. Canonicalize names, providers, and URLs in memory.
5. Perform exact comparisons first.
6. Generate fuzzy-name candidates using a conservative similarity threshold.
7. Manually inspect every fuzzy result using the provider and URL evidence.
8. Check whether snapshot and live database differ from one another.
9. Do not remove or replace proposed records; report collisions and recommend the next decision.

## Required deliverable

Return a concise duplicate-audit report containing:

1. The live database name and total scholarship count, without credentials.
2. Confirmation that the SQL snapshot was inspected.
3. Confirmation that all 60 proposals were checked.
4. A table of definite duplicates with:
   - proposed rank and name;
   - existing database ID and name;
   - provider comparison;
   - URL comparison;
   - duplicate rationale.
5. A separate table of possible/fuzzy duplicates requiring user judgment.
6. A list of same-provider but clearly distinct programs.
7. Snapshot-versus-live discrepancies relevant to duplication.
8. A count of proposals with no detected duplicate.
9. Any comparison limitations or malformed data.
10. This exact statement: **“No database, SQL snapshot, website, crawler, or research records were changed.”**

If definite duplicates exist, identify their proposed rank numbers but do not edit the approval report or workbook unless the user explicitly asks.

## Stop condition

Stop immediately after presenting the duplicate-audit results. Do not begin the second rules verification or import. Import remains prohibited until the user explicitly approves a final, duplicate-cleared list.
