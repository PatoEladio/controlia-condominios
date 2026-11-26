// Validación de RUT chileno con módulo 11

// "12.345.678-k" → "12345678-K" (sin puntos ni espacios, K en mayúscula)
export const cleanRut = (rut: string) => rut.replace(/[.\s]/g, '').toUpperCase()

// Dígito verificador (módulo 11) para el cuerpo numérico del RUT
export const rutCheckDigit = (body: string): string => {
  let sum = 0
  let factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const remainder = 11 - (sum % 11)
  if (remainder === 11) return '0'
  if (remainder === 10) return 'K'
  return String(remainder)
}

// Acepta "12345678-5", "12.345.678-5" o "123456785"
export const isValidRut = (rut: string): boolean => {
  const clean = cleanRut(rut).replace('-', '')
  if (!/^\d{7,8}[\dK]$/.test(clean)) return false
  const body = clean.slice(0, -1)
  return rutCheckDigit(body) === clean.slice(-1)
}

// Devuelve el RUT en formato "12345678-5"
export const normalizeRut = (rut: string): string => {
  const clean = cleanRut(rut).replace('-', '')
  return clean.length > 1 ? `${clean.slice(0, -1)}-${clean.slice(-1)}` : clean
}
