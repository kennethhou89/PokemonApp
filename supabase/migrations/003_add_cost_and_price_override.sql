-- Add purchase cost and manual price override to collection items
ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_override NUMERIC(10,2);

COMMENT ON COLUMN collection_items.cost IS 'What the user paid for this card';
COMMENT ON COLUMN collection_items.price_override IS 'Manual market price override — replaces API price when set';
