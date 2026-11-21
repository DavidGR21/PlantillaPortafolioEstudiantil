-- =====================================================================
--  PLANTILLA PORTAFOLIO - Esquema de base de datos (PostgreSQL / Neon)
-- ---------------------------------------------------------------------
--  Ejecutar completo en el SQL Editor de Neon (o con psql).
--  Es idempotente en extensiones/tipos; para reinstalar desde cero
--  descomenta el bloque "RESET" de abajo.
--
--  Jerarquía:
--    users (1) ──< portfolios (máx. 3) ──< sections ──< subsections
--                                         ──< posts ──< post_files (PDF/imagen)
-- =====================================================================

-- ---------- RESET (solo desarrollo, ¡borra todo!) ---------------------
-- DROP TABLE IF EXISTS admin_actions, login_attempts, post_files, posts,
--                      subsections, sections, portfolios, users CASCADE;
-- DROP TYPE  IF EXISTS user_role, portfolio_status, file_kind CASCADE;
-- DROP VIEW  IF EXISTS public_portfolios;

-- ---------- Extensiones ----------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS citext;    -- email sin distinguir mayúsculas

-- ---------- Tipos ----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portfolio_status AS ENUM ('active', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE file_kind AS ENUM ('pdf', 'image');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Función genérica updated_at -------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
--  USERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext      NOT NULL UNIQUE,
  full_name       varchar(150) NOT NULL,
  password_hash   text        NOT NULL,              -- bcrypt
  role            user_role   NOT NULL DEFAULT 'student',
  is_active       boolean     NOT NULL DEFAULT true, -- false = no puede iniciar sesión
  max_portfolios  smallint    NOT NULL DEFAULT 3 CHECK (max_portfolios BETWEEN 0 AND 20),
  created_by      uuid        REFERENCES users(id) ON DELETE SET NULL,
  last_login_at   timestamptz,
  password_changed_at timestamptz,                   -- invalida sesiones anteriores a esta fecha
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
--  LOGIN_ATTEMPTS  (límite de intentos de inicio de sesión)
-- =====================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id          bigserial PRIMARY KEY,
  email       citext      NOT NULL,
  ip          text        NOT NULL,
  success     boolean     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_old   ON login_attempts (created_at);

-- =====================================================================
--  PORTFOLIOS  (URL pública: /p/:slug)
-- =====================================================================
CREATE TABLE IF NOT EXISTS portfolios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug            text        NOT NULL UNIQUE,     -- sólo minúsculas (ver CHECK)
  title           varchar(150) NOT NULL,
  subtitle        varchar(255),
  description     text,
  avatar_url      text,
  avatar_key      text,                              -- clave en el bucket
  cover_key       text,                              -- imagen de portada (inicio)
  cover_info      jsonb       NOT NULL DEFAULT '{}'::jsonb, -- datos de carátula
  theme           jsonb       NOT NULL DEFAULT '{}'::jsonb, -- colores, plantilla, etc.
  status          portfolio_status NOT NULL DEFAULT 'active',
  blocked_reason  text,
  blocked_at      timestamptz,
  blocked_by      uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- slug: minúsculas, números y guiones, 3-60 caracteres
  CONSTRAINT portfolios_slug_format
    CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]$'),
  CONSTRAINT portfolios_blocked_consistency
    CHECK ((status = 'blocked') = (blocked_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_portfolios_owner  ON portfolios(owner_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(status);

DROP TRIGGER IF EXISTS trg_portfolios_updated_at ON portfolios;
CREATE TRIGGER trg_portfolios_updated_at
  BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Límite de portafolios por usuario (por defecto 3, configurable en users.max_portfolios)
CREATE OR REPLACE FUNCTION enforce_portfolio_limit() RETURNS trigger AS $$
DECLARE
  v_max   smallint;
  v_count integer;
BEGIN
  -- Bloquea la fila del usuario para evitar condiciones de carrera
  SELECT max_portfolios INTO v_max FROM users WHERE id = NEW.owner_id FOR UPDATE;
  SELECT count(*) INTO v_count FROM portfolios WHERE owner_id = NEW.owner_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'PORTFOLIO_LIMIT_REACHED: el usuario ya tiene % portafolio(s) (máximo %)',
      v_count, v_max USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_portfolios_limit ON portfolios;
CREATE TRIGGER trg_portfolios_limit
  BEFORE INSERT OR UPDATE OF owner_id ON portfolios
  FOR EACH ROW EXECUTE FUNCTION enforce_portfolio_limit();

-- =====================================================================
--  SECTIONS  (apartados del menú de navegación)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id  uuid        NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  title         varchar(100) NOT NULL,
  slug          varchar(100) NOT NULL,
  description   text,                                -- texto bajo la portada del apartado
  cover_key     text,                                -- imagen de portada del apartado
  position      integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sections_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT sections_unique_slug UNIQUE (portfolio_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sections_portfolio ON sections(portfolio_id, position);

DROP TRIGGER IF EXISTS trg_sections_updated_at ON sections;
CREATE TRIGGER trg_sections_updated_at
  BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
--  SUBSECTIONS  (submódulos: Parcial 1, Parcial 2, ...)
-- =====================================================================
CREATE TABLE IF NOT EXISTS subsections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  uuid        NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title       varchar(100) NOT NULL,
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subsections_section ON subsections(section_id, position);

DROP TRIGGER IF EXISTS trg_subsections_updated_at ON subsections;
CREATE TRIGGER trg_subsections_updated_at
  BEFORE UPDATE ON subsections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
--  POSTS  (publicaciones dentro de un submódulo)
-- =====================================================================
CREATE TABLE IF NOT EXISTS posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id  uuid        NOT NULL REFERENCES subsections(id) ON DELETE CASCADE,
  title          varchar(200) NOT NULL,
  description    text,                               -- opcional
  position       integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_posts_subsection ON posts(subsection_id, position);

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
--  POST_FILES  (uno o varios PDF / imágenes por publicación)
--  El archivo vive en el bucket; aquí se guarda la referencia.
-- =====================================================================
CREATE TABLE IF NOT EXISTS post_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  kind          file_kind   NOT NULL,
  original_name varchar(255) NOT NULL,
  mime_type     varchar(100) NOT NULL,
  size_bytes    bigint      NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800), -- 50 MB
  storage_key   text        NOT NULL UNIQUE,         -- ruta/clave en el bucket (para borrar)
  url           text        NOT NULL,                -- URL pública o base para firmar
  position      integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_files_mime_matches_kind CHECK (
    (kind = 'pdf'   AND mime_type = 'application/pdf') OR
    (kind = 'image' AND mime_type IN ('image/jpeg','image/png','image/webp','image/gif'))
  )
);

CREATE INDEX IF NOT EXISTS idx_post_files_post ON post_files(post_id, position);

-- =====================================================================
--  ADMIN_ACTIONS  (bitácora de acciones del administrador)
-- =====================================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id           bigserial PRIMARY KEY,
  admin_id     uuid        REFERENCES users(id) ON DELETE SET NULL,
  action       varchar(50) NOT NULL,  -- CREATE_USER, BLOCK_PORTFOLIO, UNBLOCK_PORTFOLIO, DELETE_PORTFOLIO, ...
  target_type  varchar(30) NOT NULL,  -- user | portfolio
  target_id    uuid,
  details      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

-- =====================================================================
--  VISTA: portafolios visibles públicamente
--  (activo y cuyo dueño está activo)
-- =====================================================================
CREATE OR REPLACE VIEW public_portfolios AS
SELECT p.id, p.slug, p.title, p.subtitle, p.description, p.avatar_url,
       p.theme, p.updated_at, u.full_name AS owner_name
FROM portfolios p
JOIN users u ON u.id = p.owner_id
WHERE p.status = 'active' AND u.is_active = true;

-- =====================================================================
--  FUNCIÓN DE APOYO: obtener las claves de bucket de un portafolio
--  (la API la usa ANTES de borrar el portafolio para limpiar el bucket)
-- =====================================================================
CREATE OR REPLACE FUNCTION portfolio_storage_keys(p_portfolio_id uuid)
RETURNS TABLE (storage_key text) AS $$
  SELECT f.storage_key
  FROM post_files f
  JOIN posts       po ON po.id = f.post_id
  JOIN subsections ss ON ss.id = po.subsection_id
  JOIN sections    s  ON s.id  = ss.section_id
  WHERE s.portfolio_id = p_portfolio_id
  UNION ALL
  SELECT s.cover_key FROM sections s WHERE s.portfolio_id = p_portfolio_id AND s.cover_key IS NOT NULL
  UNION ALL
  SELECT k FROM portfolios p, LATERAL (VALUES (p.avatar_key), (p.cover_key)) v(k)
  WHERE p.id = p_portfolio_id AND k IS NOT NULL;
$$ LANGUAGE sql STABLE;
