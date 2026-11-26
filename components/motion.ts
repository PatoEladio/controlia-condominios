import type { CSSProperties } from 'react'

// Retraso escalonado para animar filas / tarjetas en cascada (clases .fa-row / .fa-grow).
// Se limita el índice para que listas largas no tarden en aparecer.
export const stagger = (index: number, max = 12): CSSProperties =>
  ({ '--i': Math.min(index, max) }) as CSSProperties
