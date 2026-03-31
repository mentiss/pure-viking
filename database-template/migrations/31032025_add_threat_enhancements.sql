-- Threats : icône, statut narratif, épinglage, ordre manuel
ALTER TABLE threats ADD COLUMN icon       TEXT    DEFAULT '⚠';
ALTER TABLE threats ADD COLUMN status     TEXT    DEFAULT 'active'
    CHECK(status IN ('active', 'dormante', 'neutralisée'));
ALTER TABLE threats ADD COLUMN pinned     INTEGER DEFAULT 0;
ALTER TABLE threats ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Clocks : icône + épinglage
ALTER TABLE clocks  ADD COLUMN icon       TEXT    DEFAULT '⏱';
ALTER TABLE clocks  ADD COLUMN pinned     INTEGER DEFAULT 0;

-- Clocks
CREATE INDEX IF NOT EXISTS idx_clocks_session_id  ON clocks (session_id);
CREATE INDEX IF NOT EXISTS idx_clocks_pinned       ON clocks (pinned);

-- Threats
CREATE INDEX IF NOT EXISTS idx_threats_session_id  ON threats (session_id);
CREATE INDEX IF NOT EXISTS idx_threats_pinned       ON threats (pinned);
CREATE INDEX IF NOT EXISTS idx_threats_status       ON threats (status);
CREATE INDEX IF NOT EXISTS idx_threats_sort_order   ON threats (sort_order);

-- Join table
CREATE INDEX IF NOT EXISTS idx_clock_threats_clock_id   ON clock_threats (clock_id);
CREATE INDEX IF NOT EXISTS idx_clock_threats_threat_id  ON clock_threats (threat_id);