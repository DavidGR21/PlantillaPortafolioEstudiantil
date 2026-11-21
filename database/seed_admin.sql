-- =====================================================================
--  Crear el PRIMER administrador (ejecutar una sola vez, después de schema.sql)
--  CAMBIA el correo, nombre y contraseña antes de ejecutar.
--  crypt(..., gen_salt('bf', 10)) genera un hash bcrypt compatible con bcryptjs.
-- =====================================================================
INSERT INTO users (email, full_name, password_hash, role, max_portfolios)
VALUES (
  'admin@tu-dominio.com',
  'Administrador',
  crypt('CambiaEstaContraseña123!', gen_salt('bf', 10)),
  'admin',
  3          -- portafolios propios permitidos (0 = el admin solo administra)
)
ON CONFLICT (email) DO NOTHING;
