-- Tenga API storage.
--
-- The whole order is kept as JSON in `doc`, because the app already owns that
-- shape and the two must not drift apart. The columns beside it exist only so
-- the server can find, filter and secure things without parsing every row.

CREATE TABLE IF NOT EXISTS orders (
  ref           TEXT PRIMARY KEY,
  token         TEXT NOT NULL,
  collect_code  TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  recipient     TEXT,
  status        TEXT NOT NULL,
  ship_mode     TEXT NOT NULL DEFAULT 'sea',
  total_pence   INTEGER NOT NULL DEFAULT 0,
  paid_pence    INTEGER NOT NULL DEFAULT 0,
  doc           TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS orders_email   ON orders(email);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at DESC);

-- Every message we actually sent, kept whether or not the provider is wired up
-- yet, so "did the customer get told" is answerable from one place.
CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  ref        TEXT NOT NULL REFERENCES orders(ref) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  channel    TEXT NOT NULL,
  recipient  TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL,
  provider_id TEXT,
  error      TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_ref ON messages(ref, created_at DESC);

-- Append only. Nothing here is ever updated or deleted.
CREATE TABLE IF NOT EXISTS audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ref        TEXT,
  action     TEXT NOT NULL,
  before_val TEXT,
  after_val  TEXT,
  reason     TEXT,
  actor      TEXT NOT NULL,
  ip_hash    TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_ref ON audit(ref, created_at DESC);

-- PayPal tells us a payment cleared by calling us directly. We record the raw
-- event before acting on it, and the unique id makes a replayed webhook a
-- no-op rather than a second payment.
CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  ref          TEXT NOT NULL,
  kind         TEXT NOT NULL,
  provider     TEXT NOT NULL,
  provider_ref TEXT UNIQUE,
  amount_pence INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'GBP',
  status       TEXT NOT NULL,
  raw          TEXT,
  created_at   INTEGER NOT NULL,
  paid_at      INTEGER
);
CREATE INDEX IF NOT EXISTS payments_ref ON payments(ref);

-- Staff sign-in. One row per person, no self-service signup.
CREATE TABLE IF NOT EXISTS staff (
  email      TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  pw_hash    TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'ops',
  created_at INTEGER NOT NULL,
  last_seen  INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL REFERENCES staff(email) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

-- Settings live in the database so pricing can change without a deploy.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
