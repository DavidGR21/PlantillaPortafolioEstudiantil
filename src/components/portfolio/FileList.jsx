import { useState } from 'react'
import { formatBytes } from '../../utils/format.js'
import { FileViewer } from './FileViewer.jsx'

/**
 * Archivos de una publicación (vista pública): imágenes en cuadrícula y PDFs en
 * lista. Al hacer clic se abre el visor, que permite recorrer todos los archivos.
 */
export function FileList({ files }) {
  const [viewerIndex, setViewerIndex] = useState(null)
  if (files.length === 0) return null

  // Mismo orden que se muestra: primero imágenes, luego PDFs.
  const images = files.filter((f) => f.kind === 'image')
  const pdfs = files.filter((f) => f.kind === 'pdf')
  const ordered = [...images, ...pdfs]

  return (
    <div className="pf-files">
      {images.length > 0 && (
        <ul className="pf-files__images">
          {images.map((file, i) => (
            <li key={file.id}>
              <button
                type="button"
                className="pf-files__thumb"
                onClick={() => setViewerIndex(i)}
                aria-label={`Ver imagen ${file.name}`}
              >
                <img src={file.url} alt={file.name} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pdfs.length > 0 && (
        <ul className="pf-files__docs">
          {pdfs.map((file, i) => (
            <li key={file.id} className="pf-file">
              <button
                type="button"
                className="pf-file__open"
                onClick={() => setViewerIndex(images.length + i)}
                aria-label={`Ver documento ${file.name}`}
              >
                <span className="pf-file__icon" aria-hidden="true">
                  PDF
                </span>
                <span className="pf-file__name">{file.name}</span>
                <span className="pf-file__size">{formatBytes(Number(file.size))}</span>
              </button>
              {file.downloadUrl && (
                <a className="pf-file__download" href={file.downloadUrl} title={`Descargar ${file.name}`} aria-label={`Descargar ${file.name}`}>
                  ⬇
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewerIndex !== null && (
        <FileViewer
          files={ordered}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  )
}
