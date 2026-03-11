create table dice_history_dg_tmp
(
    id              INTEGER
        primary key autoincrement,
    character_id    INTEGER not null
        references characters
            on delete cascade,
    roll_type       TEXT    not null,
    roll_target     TEXT,
    pool            INTEGER,
    threshold       INTEGER,
    results         TEXT,
    successes       INTEGER,
    saga_spent      INTEGER  default 0,
    saga_recovered  INTEGER  default 0,
    created_at      DATETIME default CURRENT_TIMESTAMP,
    session_id      INTEGER
                            references game_sessions
                                on delete set null,
    notation        TEXT,
    roll_definition TEXT,
    roll_result     TEXT
);

insert into dice_history_dg_tmp(id, character_id, roll_type, roll_target, pool, threshold, results, successes,
                                saga_spent, saga_recovered, created_at, session_id, notation, roll_definition,
                                roll_result)
select id,
       character_id,
       roll_type,
       roll_target,
       pool,
       threshold,
       results,
       successes,
       saga_spent,
       saga_recovered,
       created_at,
       session_id,
       notation,
       roll_definition,
       roll_result
from dice_history;

drop table dice_history;

alter table dice_history_dg_tmp
    rename to dice_history;

create index idx_dice_character
    on dice_history (character_id);

create index idx_dice_created
    on dice_history (created_at);

create index idx_dice_history_session
    on dice_history (session_id);

