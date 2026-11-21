// Sin caracteres que se confunden al dictarlos o copiarlos (0/O, 1/l/I).
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '-_.!?'
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

function randomIndex(max) {
  // Rechazo para evitar sesgo de módulo.
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return buf[0] % max
}

const pick = (chars) => chars[randomIndex(chars.length)]

/** Contraseña aleatoria segura (al menos una minúscula, mayúscula, dígito y símbolo). */
export function generatePassword(length = 12) {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)]
  while (chars.length < length) chars.push(pick(ALL))
  // Mezcla (Fisher-Yates)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
