-- Non-destructive migration for an existing ScholarMatch database.
-- Precondition: both orphan-check queries must return 0 before running ALTER TABLE.

SELECT COUNT(*) AS orphaned_submission_owners
FROM scholarship_submissions AS submissions
LEFT JOIN users AS owners ON owners.id = submissions.user_id
WHERE owners.id IS NULL;

SELECT COUNT(*) AS orphaned_submission_reviewers
FROM scholarship_submissions AS submissions
LEFT JOIN users AS reviewers ON reviewers.id = submissions.reviewed_by
WHERE submissions.reviewed_by IS NOT NULL
  AND reviewers.id IS NULL;

ALTER TABLE scholarship_submissions
  ADD INDEX idx_submission_user_id (user_id),
  ADD INDEX idx_submission_reviewed_by (reviewed_by),
  ADD CONSTRAINT fk_submission_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_submission_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL;
