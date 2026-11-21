/**
 * Lista ordenada de todas las páginas navegables del portafolio: cada parcial
 * (o el apartado, si no tiene parciales). Se usa para «Anterior / Siguiente».
 */
export function buildPages(portfolio, sections) {
  const base = `/p/${portfolio.slug}`
  return sections.flatMap((section) =>
    section.subsections.length > 0
      ? section.subsections.map((sub) => ({
          key: sub.id,
          to: `${base}/${section.slug}?parcial=${sub.id}`,
          title: sub.title,
          context: section.title,
        }))
      : [{ key: section.id, to: `${base}/${section.slug}`, title: section.title, context: 'Apartado' }],
  )
}
