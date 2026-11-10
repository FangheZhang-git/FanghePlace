-- Public source provenance and eligibility details for researched scholarships.
-- scholarships must exist first. No changes to existing scholarship columns.
CREATE TABLE IF NOT EXISTS scholarship_research (
    scholarship_id BIGINT NOT NULL PRIMARY KEY,
    research_json JSON NOT NULL,
    checked_on DATE NOT NULL,
    CONSTRAINT fk_scholarship_research_scholarship FOREIGN KEY (scholarship_id)
        REFERENCES scholarships(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
