-- SportMeet (PostgreSQL) - Schema / Tabellen
-- Reihenfolge ist wichtig wegen Foreign Keys.

BEGIN;

-- Optional: saubere UUIDs (falls du später umstellen willst)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) USERS
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ NULL
);

-- 2) GROUPS (Invite-Code direkt hier)
CREATE TABLE IF NOT EXISTS groups (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  invite_code VARCHAR(32)  NOT NULL UNIQUE,
  color       VARCHAR(7)   NOT NULL DEFAULT '#3B82F6',
  created_by  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) GROUP_USERS (Mitgliedschaften)  (Many-to-Many)
CREATE TABLE IF NOT EXISTS group_users (
  group_id  BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   BIGINT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role      VARCHAR(16) NOT NULL DEFAULT 'member', -- optional: 'member' | 'admin'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_users_role_check CHECK (role IN ('member', 'admin'))
);

-- 4) SPORTS (Vorauswahl-Liste)
CREATE TABLE IF NOT EXISTS sports (
  id   BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

-- 5) EVENTS (Termine)
CREATE TABLE IF NOT EXISTS events (
  id                BIGSERIAL PRIMARY KEY,

  title             VARCHAR(140) NOT NULL,
  description       TEXT NULL,

  -- Sportart: entweder sport_id ODER custom_sport_name
  sport_id          BIGINT NULL REFERENCES sports(id) ON DELETE SET NULL,
  custom_sport_name VARCHAR(80) NULL,

  start_datetime    TIMESTAMPTZ NOT NULL,

  -- Adresse gesplittet
  location_name     VARCHAR(140) NULL,
  street            VARCHAR(140) NOT NULL,
  house_number      VARCHAR(20)  NOT NULL,
  postal_code       VARCHAR(12)  NOT NULL,
  city              VARCHAR(80)  NOT NULL,
  country           VARCHAR(2)   NOT NULL DEFAULT 'DE',

  -- Koordinaten für Umkreis (können beim Speichern via Geocoding gesetzt werden)
  latitude          DOUBLE PRECISION NULL,
  longitude         DOUBLE PRECISION NULL,

  -- Sichtbarkeit: öffentlich oder Gruppen-Termin
  is_public         BOOLEAN NOT NULL DEFAULT TRUE,
  group_id          BIGINT NULL REFERENCES groups(id) ON DELETE SET NULL,

  created_by        BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Konsistenzregeln
  CONSTRAINT events_sport_check CHECK (
    (sport_id IS NOT NULL AND custom_sport_name IS NULL)
    OR
    (sport_id IS NULL AND custom_sport_name IS NOT NULL)
  ),
  CONSTRAINT events_visibility_check CHECK (
    (is_public = TRUE  AND group_id IS NULL)
    OR
    (is_public = FALSE AND group_id IS NOT NULL)
  )
);

-- 6) EVENT_PARTICIPANTS (Teilnahme / Zusage-Status)
CREATE TABLE IF NOT EXISTS event_participants (
  event_id  BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   BIGINT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  status    VARCHAR(16) NOT NULL DEFAULT 'accepted', -- accepted | declined
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_participants_status_check CHECK (status IN ('accepted', 'declined'))
);

-- 7) COMMENTS (Kommentare unter Terminen)
CREATE TABLE IF NOT EXISTS comments (
  id         BIGSERIAL PRIMARY KEY,
  event_id   BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- 8) EVENT_REMINDERS (merkt: Reminder wurde gesendet -> verhindert doppelte Mails)
CREATE TABLE IF NOT EXISTS event_reminders (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 9) Sessions

CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

-- Indizes (Performance / typische Queries)
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events (start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_group_id       ON events (group_id);
CREATE INDEX IF NOT EXISTS idx_events_is_public      ON events (is_public);
CREATE INDEX IF NOT EXISTS idx_comments_event_id     ON comments (event_id);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);


COMMIT;

-- Optional: Start-Daten für Sportarten
-- INSERT INTO sports (name) VALUES
-- ('Fußball'), ('Basketball'), ('Joggen'), ('Schwimmen')
-- ON CONFLICT DO NOTHING;
