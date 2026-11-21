-- =====================================================================
--  Migración 002 — Portadas, carátula y texto de los apartados
--  Idempotente. (schema.sql ya incluye estos cambios para instalaciones nuevas.)
-- =====================================================================

-- Imagen de portada y datos de carátula del portafolio (página de inicio).
--   cover_info: { "institution": "...", "subtitle": "...", "fields": [{ "label": "Docente", "value": "..." }] }
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS cover_key  text;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS cover_info jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Imagen de portada y texto de presentación de cada apartado.
ALTER TABLE sections ADD COLUMN IF NOT EXISTS cover_key   text;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS description text;

-- Claves del bucket de un portafolio: ahora incluye también las portadas,
-- para que eliminar el portafolio limpie todas sus imágenes.
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
