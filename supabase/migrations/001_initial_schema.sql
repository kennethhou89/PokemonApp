-- Cards cache table (shared across all users, populated on first add)
CREATE TABLE IF NOT EXISTS cards (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  set_id        TEXT NOT NULL,
  set_name      TEXT NOT NULL,
  number        TEXT NOT NULL,
  rarity        TEXT,
  supertype     TEXT,
  subtypes      TEXT[],
  image_small   TEXT,
  image_large   TEXT,
  hp            TEXT,
  last_fetched  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prices cache (refreshed every 24h, keyed by card_id)
CREATE TABLE IF NOT EXISTS prices (
  card_id     TEXT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  market      NUMERIC(10,2),
  low         NUMERIC(10,2),
  mid         NUMERIC(10,2),
  high        NUMERIC(10,2),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User collection items
CREATE TABLE IF NOT EXISTS collection_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id     TEXT NOT NULL REFERENCES cards(id),
  condition   TEXT NOT NULL CHECK (condition IN (
                'mint', 'near_mint', 'lightly_played',
                'moderately_played', 'heavily_played', 'damaged'
              )),
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  foil        BOOLEAN NOT NULL DEFAULT FALSE,
  notes       TEXT,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, card_id, condition)
);

-- Indexes
CREATE INDEX IF NOT EXISTS collection_items_user_id_idx ON collection_items(user_id);
CREATE INDEX IF NOT EXISTS collection_items_card_id_idx ON collection_items(card_id);

-- Enable Row Level Security
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- RLS policies: collection_items (user can only see/modify their own)
CREATE POLICY "Users can view own collection"
  ON collection_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collection"
  ON collection_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collection"
  ON collection_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collection"
  ON collection_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies: cards (readable by all authed users, writable by all authed users for caching)
CREATE POLICY "Authed users can read cards"
  ON cards FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authed users can upsert cards"
  ON cards FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authed users can update cards"
  ON cards FOR UPDATE
  TO authenticated
  USING (TRUE);

-- RLS policies: prices (readable by all authed users, writable by all authed users)
CREATE POLICY "Authed users can read prices"
  ON prices FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authed users can upsert prices"
  ON prices FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authed users can update prices"
  ON prices FOR UPDATE
  TO authenticated
  USING (TRUE);
