ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS user_photos TEXT[] DEFAULT '{}';
