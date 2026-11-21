import { formatBytes } from '../../utils/format.js'

/**
 * Archivos de una publicación: imágenes en cuadrícula y PDFs como lista.
 * (El visor integrado de PDF/imágenes llega en el paso 14; por ahora se abren en otra pestaña.)
 */
export function FileList({ files }) {
  if (files.length === 0) return null

  const images = files.filter((f) => f.kind === 'image')
  const pdfs = files.filter((f) => f.kind === 'pdf')

  return (
    <div className="pf-files">
      {images.length > 0 && (
        <ul className="pf-files__images">
          {images.map((file) => (
            <li key={file.id}>
              <a href={file.url} target="_blank" rel="noreferrer" title={file.name}>
                <img src={file.url} alt={file.name} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {pdfs.length > 0 && (
        <ul className="pf-files__docs">
          {pdfs.map((file) => (
            <li key={file.id}>
              <a className="pf-file" href={file.url} target="_blank" rel="noreferrer">
                <span className="pf-file__icon" aria-hidden="true">
                  PDF
                </span>
                <span className="pf-file__name">{file.name}</span>
                <span className="pf-file__size">{formatBytes(Number(file.size))}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
