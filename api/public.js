import { sql } from './_lib/db.js'
import { getSessionUser } from './_lib/auth.js'
import { createHandler, HttpError, sendJson } from './_lib/http.js'
import { createDownloadUrl } from './_lib/storage.js'
import { SLUG_REGEX } from './_lib/validators/portfolio.js'

/*
 * GET /api/public?slug=<slug>  (sin sesión)
 *   -> { portfolio, sections: [...árbol...], viewer: { canEdit, preview } }
 *
 * Visible si el portafolio está activo y su dueño está activo.
 * Si está bloqueado, solo lo ven su dueño y los administradores (preview = true);
 * el resto recibe 403 PORTFOLIO_UNAVAILABLE.
 */

/**
 * El bucket es privado: cada archivo recibe una URL firmada temporal
 * (url = ver en el navegador, downloadUrl = descargar). La clave interna
 * del bucket no se envía al cliente.
 */
async function signSectionFiles(sections) {
  const signFile = async ({ key, ...file }) => {
    const [url, downloadUrl] = await Promise.all([
      createDownloadUrl(key, { fileName: file.name, contentType: file.mimeType }),
      createDownloadUrl(key, { fileName: file.name, contentType: file.mimeType, download: true }),
    ])
    return { ...file, url, downloadUrl }
  }

  return Promise.all(
    sections.map(async (section) => ({
      ...section,
      subsections: await Promise.all(
        section.subsections.map(async (sub) => ({
          ...sub,
          posts: await Promise.all(
            sub.posts.map(async (post) => ({ ...post, files: await Promise.all(post.files.map(signFile)) })),
          ),
        })),
      ),
    })),
  )
}

async function getPublicPortfolio(req, res) {
  const slug = String(req.query.slug ?? '').trim().toLowerCase()
  if (!SLUG_REGEX.test(slug)) throw new HttpError(404, 'Portafolio no encontrado', 'NOT_FOUND')

  // Árbol completo en una sola consulta: apartados > parciales > publicaciones > archivos.
  const [row] = await sql`
    SELECT
      p.id, p.owner_id, p.slug, p.title, p.subtitle, p.description, p.avatar_key, p.theme,
      p.status, p.updated_at,
      u.full_name AS owner_name, u.is_active AS owner_active,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', s.id, 'title', s.title, 'slug', s.slug,
          'subsections', COALESCE((
            SELECT json_agg(json_build_object(
              'id', ss.id, 'title', ss.title,
              'posts', COALESCE((
                SELECT json_agg(json_build_object(
                  'id', po.id, 'title', po.title, 'description', po.description,
                  'createdAt', po.created_at,
                  'files', COALESCE((
                    SELECT json_agg(json_build_object(
                      'id', f.id, 'kind', f.kind, 'name', f.original_name,
                      'mimeType', f.mime_type, 'size', f.size_bytes, 'key', f.storage_key
                    ) ORDER BY f.position, f.created_at)
                    FROM post_files f WHERE f.post_id = po.id
                  ), '[]'::json)
                ) ORDER BY po.position, po.created_at)
                FROM posts po WHERE po.subsection_id = ss.id
              ), '[]'::json)
            ) ORDER BY ss.position, ss.created_at)
            FROM subsections ss WHERE ss.section_id = s.id
          ), '[]'::json)
        ) ORDER BY s.position, s.created_at)
        FROM sections s WHERE s.portfolio_id = p.id
      ), '[]'::json) AS sections
    FROM portfolios p
    JOIN users u ON u.id = p.owner_id
    WHERE p.slug = ${slug}
  `

  if (!row) throw new HttpError(404, 'Portafolio no encontrado', 'NOT_FOUND')

  // Solo se consulta la sesión si hay cookie (los visitantes anónimos no pagan esa consulta).
  const viewer = req.headers.cookie ? await getSessionUser(req) : null
  const isOwner = viewer?.id === row.owner_id
  const isAdmin = viewer?.role === 'admin'
  const isPublic = row.status === 'active' && row.owner_active

  if (!isPublic && !isOwner && !isAdmin) {
    throw new HttpError(403, 'Este portafolio no está disponible en este momento', 'PORTFOLIO_UNAVAILABLE')
  }

  const [sections, avatarUrl] = await Promise.all([
    signSectionFiles(row.sections),
    row.avatar_key ? createDownloadUrl(row.avatar_key) : null,
  ])

  return sendJson(res, 200, {
    portfolio: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      avatarUrl,
      theme: row.theme,
      ownerName: row.owner_name,
      updatedAt: row.updated_at,
      status: row.status,
    },
    sections,
    viewer: {
      canEdit: isOwner,
      preview: !isPublic, // true = el público NO lo ve; solo dueño/admin
    },
  })
}

export default createHandler({ GET: getPublicPortfolio })
