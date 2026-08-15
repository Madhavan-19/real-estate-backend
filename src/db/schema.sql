-- ============================================================
-- Real Estate Platform — PostgreSQL Schema
-- Designed to stay fast at 50,000+ property rows.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ---------------- USERS ----------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(20) NOT NULL DEFAULT 'user', -- user | admin
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------- REFRESH TOKENS ----------------
-- Stored server-side (hashed) so tokens can be revoked individually
-- (logout / logout-all) instead of trusting a stateless JWT alone.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ---------------- PROPERTIES ----------------
CREATE TABLE IF NOT EXISTS properties (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(200) NOT NULL,
  slug             VARCHAR(220) UNIQUE NOT NULL, -- SEO-friendly URL segment
  description      TEXT NOT NULL,
  property_type    VARCHAR(30) NOT NULL,   -- apartment | villa | plot | office | pg
  listing_type     VARCHAR(10) NOT NULL DEFAULT 'sale', -- sale | rent
  price            NUMERIC(14,2) NOT NULL,
  city             VARCHAR(100) NOT NULL,
  locality         VARCHAR(150),
  address          TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  bedrooms         SMALLINT DEFAULT 0,
  bathrooms        SMALLINT DEFAULT 0,
  area_sqft        NUMERIC(10,2),
  images           JSONB NOT NULL DEFAULT '[]', -- [{url, publicId}]
  amenities        JSONB NOT NULL DEFAULT '[]',
  status           VARCHAR(20) NOT NULL DEFAULT 'active', -- active | sold | rented | inactive
  views_count      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the actual query patterns used by the API:
--   WHERE city=? AND property_type=? AND price BETWEEN ? AND ? AND bedrooms=?
--   ORDER BY created_at DESC / price ASC   + keyset/offset pagination
CREATE INDEX IF NOT EXISTS idx_properties_city          ON properties (city);
CREATE INDEX IF NOT EXISTS idx_properties_type          ON properties (property_type);
CREATE INDEX IF NOT EXISTS idx_properties_price         ON properties (price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms      ON properties (bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_owner         ON properties (owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status_created ON properties (status, created_at DESC);
-- composite index for the most common filter combo (city + type + price)
CREATE INDEX IF NOT EXISTS idx_properties_city_type_price ON properties (city, property_type, price);

-- Full text search (title + locality + city + description, weighted)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(locality, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_properties_search_vector ON properties USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  message       TEXT,
  ip_address    VARCHAR(45),
  status        VARCHAR(20) NOT NULL DEFAULT 'new',
  inquiry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_property
  ON inquiries (property_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inquiry_property_email_day
  ON inquiries (property_id, email, inquiry_date);

-- ---------------- updated_at trigger ----------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_properties_updated_at ON properties;
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
