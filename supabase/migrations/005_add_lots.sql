-- Lots table
CREATE TABLE IF NOT EXISTS lots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  total_paid  NUMERIC(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link collection items to lots
ALTER TABLE collection_items ADD COLUMN lot_id UUID REFERENCES lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lots_user_id_idx ON lots(user_id);
CREATE INDEX IF NOT EXISTS collection_items_lot_id_idx ON collection_items(lot_id);

-- RLS
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lots"
  ON lots FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lots"
  ON lots FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lots"
  ON lots FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lots"
  ON lots FOR DELETE USING (auth.uid() = user_id);
