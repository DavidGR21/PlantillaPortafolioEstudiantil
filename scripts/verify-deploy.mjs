#!/usr/bin/env node
/**
 * Verifica un despliegue en producción (no modifica nada).
 *
 * Uso:  node scripts/verify-deploy.mjs https://mi-app.vercel.app [slug-de-prueba]
 *       npm run verify -- https://mi-app.vercel.app
 *
 * Comprueba: cabeceras de seguridad, rutas del SPA, API, conexión con Neon (BD y
 * bucket), un portafolio público con sus archivos firmados, que la CSP permita
 * el bucket y que el CORS del bucket acepte subidas desde el dominio.
 */
const [baseArg, slug = 'portafolio-demo'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!baseArg) {
  console.error('Uso: node scripts/verify-deploy.mjs https://mi-app.vercel.app [slug]')
  process.exit(1)
}
const BASE = new URL(baseArg).origin

let failures = 0
let warnings = 0
const ok = (msg) => console.log(`  ✔ ${msg}`)
const bad = (msg) => {
  failures++
  console.log(`  ✘ ${msg}`)
}
const warn = (msg) => {
  warnings++
  console.log(`  ! ${msg}`)
}
const check = (cond, okMsg, badMsg) => (cond ? ok(okMsg) : bad(badMsg ?? okMsg))
const get = (path, init) => fetch(BASE + path, { redirect: 'manual', ...init })

console.log(`Verificando ${BASE}\n`)

// ---------- 1. Página y cabeceras ----------
console.log('1. Página principal y cabeceras de seguridad')
const home = await get('/')
check(home.status === 200, 'GET / responde 200', `GET / respondió ${home.status}`)
const html = await home.text()
check(html.includes('<div id="root">'), 'sirve la app de React')
const h = (name) => home.headers.get(name) ?? ''
const csp = h('content-security-policy')
check(csp.includes("script-src 'self'"), 'Content-Security-Policy presente', 'falta Content-Security-Policy')
check(h('x-frame-options') === 'DENY', 'X-Frame-Options: DENY')
check(h('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff')
check(h('strict-transport-security').includes('max-age'), 'Strict-Transport-Security (HTTPS obligatorio)')
check(h('referrer-policy') !== '', 'Referrer-Policy')
const asset = html.match(/\/assets\/[^"]+\.js/)?.[0]
if (asset) {
  const a = await get(asset, { method: 'HEAD' })
  check(a.status === 200 && (a.headers.get('cache-control') ?? '').includes('immutable'), `caché larga en ${asset}`)
}

// ---------- 2. Rutas del SPA ----------
console.log('\n2. Rutas del frontend (recargar la página no debe dar 404)')
for (const path of ['/login', `/p/${slug}`, `/p/${slug}/editar`, '/admin/usuarios', '/ruta-que-no-existe']) {
  const r = await get(path)
  check(r.status === 200 && (await r.text()).includes('<div id="root">'), `${path} -> app (200)`, `${path} respondió ${r.status}`)
}

// ---------- 3. API ----------
console.log('\n3. API y conexión con Neon')
const health = await get('/api/health')
const hb = await health.json().catch(() => ({}))
check(health.status === 200 && hb.ok, `/api/health ok (BD: ${hb.database}, bucket: ${hb.storage})`,
  `/api/health -> ${health.status} ${JSON.stringify(hb)} (revisa las variables de entorno en Vercel)`)
const me = await get('/api/auth?action=me')
check(me.status === 200 && (await me.json()).user === null, '/api/auth?action=me sin sesión -> user null')
const form = await get('/api/auth?action=login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' })
check(form.status === 415, 'login rechaza formularios no JSON (protección CSRF)', `login con formulario -> ${form.status}`)
const lib = await get('/api/_lib/db')
check(lib.status === 404, '/api/_lib no está expuesto', `/api/_lib/db -> ${lib.status}`)
const bad415 = await get('/api/auth?action=login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'no-existe@example.com', password: 'x' }) })
check(bad415.status === 401, 'login con credenciales falsas -> 401', `login falso -> ${bad415.status}`)

// ---------- 4. Portafolio público y archivos ----------
console.log(`\n4. Portafolio público /p/${slug}`)
const pub = await get(`/api/public?slug=${encodeURIComponent(slug)}`)
if (pub.status !== 200) {
  warn(`/api/public?slug=${slug} -> ${pub.status} (¿existe y está activo? indica otro slug como 2º argumento)`)
} else {
  const data = await pub.json()
  ok(`«${data.portfolio.title}» con ${data.sections.length} apartado(s)`)
  const files = data.sections.flatMap((s) => s.subsections.flatMap((ss) => ss.posts.flatMap((p) => p.files)))
  if (files.length === 0) {
    warn('el portafolio no tiene archivos: no se pudo probar la descarga firmada')
  } else {
    const f = files[0]
    const r = await fetch(f.url)
    check(r.status === 200, `archivo firmado se abre (${f.name}, ${r.headers.get('content-type')})`, `archivo firmado -> ${r.status}`)
    check(!r.headers.get('x-frame-options') && !(r.headers.get('content-security-policy') ?? '').includes('frame-ancestors'),
      'el bucket permite mostrar el PDF dentro de la página')

    // ¿La CSP permite el host del bucket? (regla CSP3: *.dominio cubre subdominios)
    const host = new URL(f.url).host
    const dirs = Object.fromEntries(csp.split(';').map((s) => s.trim().split(/\s+/)).map(([k, ...v]) => [k, v]))
    const allows = (d) => (dirs[d] ?? []).some((src) =>
      src === `https://${host}` || (src.startsWith('https://*.') && `.${host}`.endsWith(src.slice('https://*'.length))))
    for (const d of ['img-src', 'frame-src', 'connect-src']) check(allows(d), `CSP ${d} permite ${host}`)

    // ¿El bucket acepta subidas (PUT) desde este dominio?
    const pre = await fetch(f.url.split('?')[0], {
      method: 'OPTIONS',
      headers: { Origin: BASE, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
    })
    const allowOrigin = pre.headers.get('access-control-allow-origin')
    if (allowOrigin === BASE) ok(`CORS del bucket permite subir desde ${BASE}`)
    else if (allowOrigin === '*') warn('CORS del bucket abierto a cualquier sitio (*): ejecuta npm run bucket:cors')
    else bad(`CORS del bucket NO permite subir desde ${BASE} (allow-origin: ${allowOrigin})`)
  }
}

console.log(`\n${failures === 0 ? '✔ Todo correcto' : `✘ ${failures} problema(s)`}${warnings ? ` · ${warnings} aviso(s)` : ''}`)
process.exit(failures === 0 ? 0 : 1)
