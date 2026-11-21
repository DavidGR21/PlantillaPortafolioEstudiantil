-- =====================================================================
--  Migración 001 — Seguridad (paso 19)
--  Ejecutar en el SQL Editor de Neon sobre una base creada con schema.sql
--  anterior a este paso. Es idempotente (se puede ejecutar varias veces).
--  (schema.sql ya incluye estos cambios para instalaciones nuevas.)
-- =====================================================================

-- Cambiar la contraseña invalida las sesiones abiertas antes de ese momento.
-- NULL = nunca cambiada desde que existe esta columna (no cierra sesiones actuales).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Intentos de inicio de sesión (para limitar ataques de fuerza bruta).
-- En Vercel cada petición puede ir a una instancia distinta, por eso el
-- contador vive en la base de datos y no en memoria.
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
