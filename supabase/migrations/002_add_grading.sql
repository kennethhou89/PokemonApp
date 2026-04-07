-- Add grading fields to collection_items
ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS graded          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grading_company TEXT CHECK (grading_company IN ('PSA', 'BGS', 'CGC')),
  ADD COLUMN IF NOT EXISTS grade           NUMERIC(3,1) CHECK (grade >= 1 AND grade <= 10),
  ADD COLUMN IF NOT EXISTS cert_number     TEXT;

-- Add graded price cache columns to prices table
ALTER TABLE prices
  ADD COLUMN IF NOT EXISTS grade_7  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS grade_8  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS grade_9  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS grade_9_5 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS grade_10 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pricecharting_id TEXT;
