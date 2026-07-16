-- ============================================================================
-- migrate.sql  —  OLD (Wagtail "apply") -> NEW ("backend" app) data migration
-- ----------------------------------------------------------------------------
-- Reads the OLD tables directly from a `legacy` schema (the original dump,
-- restored and renamed from `public` to `legacy`) and writes them into the new
-- Django `backend_*` tables. Runs as a SINGLE TRANSACTION: either everything
-- succeeds or nothing changes.
--
-- PRECONDITIONS
--   * Target DB has the new schema applied (python manage.py migrate).
--   * Target backend_* domain tables are EMPTY (fresh migrate); aborts otherwise.
--   * The old data is present in a `legacy` schema with its ORIGINAL table names
--     (legacy.involvement_*, legacy.members_*, legacy.auth_group, ...).
--
-- STAGING THE `legacy` SCHEMA (run once before this script):
--   1. Restore the old dump into a scratch database (create role "moore" first
--      if the dump's OWNER lines error out):
--        createdb apply_legacy && psql -d apply_legacy -f apply-dump.sql
--   2. Rename its schema so the tables live under legacy.*:
--        psql -d apply_legacy -c 'ALTER SCHEMA public RENAME TO legacy'
--   3. Copy the needed tables into the target DB's legacy schema:
--        psql -d <target> -c 'CREATE SCHEMA legacy'
--        pg_dump -d apply_legacy --section=pre-data --section=data --no-owner \
--          -t 'legacy.involvement_*' -t 'legacy.members_*' -t legacy.auth_group \
--          | psql -d <target>
--   Then run this file, and `DROP SCHEMA legacy CASCADE` when done.
--
-- KEY TRANSFORMATIONS
--   * members_member.id (integer) -> backend_member.id (UUID); a temp map remaps
--     every member FK.
--   * All other tables keep their original integer IDs (new PKs are bigint).
--   * role_type 'engaged' -> 'involved'.
--   * Role<->Team and StudyProgram<->Section stay many-to-many (all links kept).
--   * Members with empty/NULL ssn get a synthetic unique placeholder ('MIG'+id).
--   * mandatehistory -> Appointment (status 'appointed', date = position.term_to).
-- ============================================================================

BEGIN;

-- Fail fast unless the destination domain tables are empty -------------------
DO $$
DECLARE n bigint;
BEGIN
  SELECT
    (SELECT count(*) FROM backend_member)      + (SELECT count(*) FROM backend_team)
  + (SELECT count(*) FROM backend_section)     + (SELECT count(*) FROM backend_studyprogram)
  + (SELECT count(*) FROM backend_role)        + (SELECT count(*) FROM backend_position)
  + (SELECT count(*) FROM backend_application) + (SELECT count(*) FROM backend_reference)
  + (SELECT count(*) FROM backend_appointment)
  INTO n;
  IF n <> 0 THEN
    RAISE EXCEPTION 'Target domain tables are not empty (% rows). Refusing to migrate into a non-empty schema.', n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 0. Member integer-id -> UUID mapping
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE member_id_map (
    old_id integer PRIMARY KEY,
    new_id uuid NOT NULL DEFAULT gen_random_uuid()
) ON COMMIT DROP;
INSERT INTO member_id_map (old_id)
SELECT id FROM legacy.members_member;

-- ---------------------------------------------------------------------------
-- 1. Section  (legacy.members_section -> backend_section)
-- ---------------------------------------------------------------------------
INSERT INTO backend_section (id, abbreviation, section_en, section_sv)
SELECT id,
       left(coalesce(abbreviation, ''), 20),
       coalesce(name_en, ''),
       coalesce(name_sv, '')
FROM legacy.members_section;

-- ---------------------------------------------------------------------------
-- 2. StudyProgram  (legacy.members_studyprogram -> backend_studyprogram)
--    Sections are a many-to-many (step 2b); degree is carried across.
-- ---------------------------------------------------------------------------
INSERT INTO backend_studyprogram (id, name_en, name_sv, degree)
SELECT id,
       coalesce(name_en, ''),
       coalesce(name_sv, ''),
       coalesce(degree, '')
FROM legacy.members_studyprogram;

-- 2b. StudyProgram <-> Section m2m: ALL links from the old junction table.
INSERT INTO backend_studyprogram_sections (studyprogram_id, section_id)
SELECT studyprogram_id, section_id
FROM legacy.members_section_studies;

-- ---------------------------------------------------------------------------
-- 3. Team  (legacy.involvement_team -> backend_team)
--    NOTE: old logo (wagtail image FK) has no destination -> logo = ''.
-- ---------------------------------------------------------------------------
INSERT INTO backend_team (id, name_en, name_sv, logo, desc_en, desc_sv)
SELECT id,
       coalesce(name_en, ''),
       coalesce(name_sv, ''),
       '',
       coalesce(description_en, ''),
       coalesce(description_sv, '')
FROM legacy.involvement_team;

-- ---------------------------------------------------------------------------
-- 4. Role  (legacy.involvement_role -> backend_role)
--    Teams are a many-to-many (step 4b). role_type 'engaged' -> 'involved'.
--    election_email carried across; dropped: group_id, phone_number.
-- ---------------------------------------------------------------------------
INSERT INTO backend_role
    (id, role_type, archived, title_en, title_sv, description_en, description_sv,
     contact_email, election_email, role_description_url)
SELECT id,
       CASE WHEN role_type = 'engaged' THEN 'involved' ELSE role_type END,
       coalesce(archived, false),
       coalesce(name_en, ''),
       coalesce(name_sv, ''),
       coalesce(description_en, ''),
       coalesce(description_sv, ''),
       coalesce(contact_email, ''),
       coalesce(election_email, ''),
       ''
FROM legacy.involvement_role;

-- 4b. Role <-> Team m2m: ALL links from the old junction table.
INSERT INTO backend_role_teams (role_id, team_id)
SELECT role_id, team_id
FROM legacy.involvement_role_teams;

-- ---------------------------------------------------------------------------
-- 5. Position  (legacy.involvement_position -> backend_position)
-- ---------------------------------------------------------------------------
INSERT INTO backend_position
    (id, recruitment_start, recruitment_end, appointed, term_from, term_end,
     comment_eng, comment_sv, role_id)
SELECT id,
       recruitment_start,
       recruitment_end,
       coalesce(appointments, 1),
       term_from,
       term_to,
       coalesce(comment_en, ''),
       coalesce(comment_sv, ''),
       role_id
FROM legacy.involvement_position;

-- ---------------------------------------------------------------------------
-- 6. Member  (legacy.members_member -> backend_member)  [integer id -> UUID]
--    ssn (= old person_nr); empty/NULL -> synthetic unique 'MIG##########'.
--    verified_email = TRUE: pre-existing accounts that predate the
--    email-verification feature.
--    study_program_id falls back to a study linked to the member's section
--    if m.study_id is NULL. section_id is carried across directly.
--    Dropped: username, date_joined, status_changed.
-- ---------------------------------------------------------------------------
INSERT INTO backend_member
    (id, password, last_login, unicore_id, email, verified_email, phone_number,
     is_superuser, is_staff, is_active, name, ssn, registration_year, status,
     study_program_id, section_id,
     email_verification_code, email_verification_code_expires_at,
     email_verification_attempts, email_verification_sent_at)
SELECT map.new_id,
       coalesce(m.password, ''),
       m.last_login,
       m.unicore_id,
       coalesce(m.email, ''),
       true,
       coalesce(m.phone_number, ''),
       coalesce(m.is_superuser, false),
       coalesce(m.is_staff, false),
       coalesce(m.is_active, true),
       coalesce(m.name, ''),
       CASE WHEN m.person_nr IS NULL OR btrim(m.person_nr) = ''
            THEN 'MIG' || lpad(m.id::text, 10, '0')
            ELSE m.person_nr END,
       coalesce(m.registration_year, ''),
       coalesce(m.status, 'unknown'),
       coalesce(m.study_id,
                (SELECT ssp.studyprogram_id
                 FROM legacy.members_section_studies ssp
                 WHERE ssp.section_id = m.section_id
                 LIMIT 1)),
       m.section_id,
       NULL, NULL, 0, NULL
FROM legacy.members_member m
JOIN member_id_map map ON map.old_id = m.id;

-- ---------------------------------------------------------------------------
-- 6b. Permission groups + member group memberships
--     auth_group: the named groups / committees (ids preserved).
--     backend_member_groups: member<->group links (member_id remapped to UUID).
--     Group permissions are NOT migrated (old content-type ids aren't portable);
--     the groups arrive permission-less. Assumes auth_group is empty.
-- ---------------------------------------------------------------------------
INSERT INTO auth_group (id, name)
SELECT id, name FROM legacy.auth_group;

INSERT INTO backend_member_groups (member_id, group_id)
SELECT map.new_id, mg.group_id
FROM legacy.members_member_groups mg
JOIN member_id_map map ON map.old_id = mg.member_id;

-- ---------------------------------------------------------------------------
-- 7. Application  (legacy.involvement_application -> backend_application)
--    member_id remapped to UUID; decision_date = old rejection_date.
--    Dropped: removed flag.
-- ---------------------------------------------------------------------------
INSERT INTO backend_application
    (id, status, cover_letter, qualifications, gdpr, decision_date, member_id, position_id)
SELECT a.id,
       a.status,
       coalesce(a.cover_letter, ''),
       coalesce(a.qualifications, ''),
       coalesce(a.gdpr, false),
       a.rejection_date,
       map.new_id,
       a.position_id
FROM legacy.involvement_application a
JOIN member_id_map map ON map.old_id = a.applicant_id;

-- ---------------------------------------------------------------------------
-- 8. Reference  (legacy.involvement_reference -> backend_reference)
--    old "position" -> title ; old phone_number -> phone_num.
-- ---------------------------------------------------------------------------
INSERT INTO backend_reference (id, name, phone_num, title, email, comment, application_id)
SELECT id,
       coalesce(name, ''),
       coalesce(phone_number, ''),
       coalesce("position", ''),
       coalesce(email, ''),
       coalesce(comment, ''),
       application_id
FROM legacy.involvement_reference;

-- ---------------------------------------------------------------------------
-- 9. Appointment  (legacy.involvement_mandatehistory -> backend_appointment)
--    One appointment per old mandate row; status 'appointed';
--    appointed_date = position.term_to; appointed_by NULL.
-- ---------------------------------------------------------------------------
INSERT INTO backend_appointment
    (appointed_date, status, resignation_date, resignation_reason, notes,
     appointed_by_id, member_id, position_id)
SELECT coalesce(p.term_from, CURRENT_DATE),
       'appointed',
       NULL, NULL, NULL,
       NULL,
       map.new_id,
       mh.position_id
FROM legacy.involvement_mandatehistory mh
JOIN member_id_map map ON map.old_id = mh.applicant_id
LEFT JOIN legacy.involvement_position p ON p.id = mh.position_id;

-- ---------------------------------------------------------------------------
-- 10. Reset sequences so future inserts don't collide with migrated ids
-- ---------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('backend_section',      'id'), coalesce((SELECT max(id) FROM backend_section),      1), true);
SELECT setval(pg_get_serial_sequence('backend_studyprogram', 'id'), coalesce((SELECT max(id) FROM backend_studyprogram), 1), true);
SELECT setval(pg_get_serial_sequence('backend_team',         'id'), coalesce((SELECT max(id) FROM backend_team),         1), true);
SELECT setval(pg_get_serial_sequence('backend_role',         'id'), coalesce((SELECT max(id) FROM backend_role),         1), true);
SELECT setval(pg_get_serial_sequence('backend_position',     'id'), coalesce((SELECT max(id) FROM backend_position),     1), true);
SELECT setval(pg_get_serial_sequence('backend_application',  'id'), coalesce((SELECT max(id) FROM backend_application),  1), true);
SELECT setval(pg_get_serial_sequence('backend_reference',    'id'), coalesce((SELECT max(id) FROM backend_reference),    1), true);
SELECT setval(pg_get_serial_sequence('backend_appointment',  'id'), coalesce((SELECT max(id) FROM backend_appointment),  1), true);
SELECT setval(pg_get_serial_sequence('auth_group',           'id'), coalesce((SELECT max(id) FROM auth_group),           1), true);
SELECT setval(pg_get_serial_sequence('backend_member_groups','id'), coalesce((SELECT max(id) FROM backend_member_groups), 1), true);
SELECT setval(pg_get_serial_sequence('backend_role_teams',           'id'), coalesce((SELECT max(id) FROM backend_role_teams),           1), true);
SELECT setval(pg_get_serial_sequence('backend_studyprogram_sections','id'), coalesce((SELECT max(id) FROM backend_studyprogram_sections), 1), true);

COMMIT;
