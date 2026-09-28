'use client'

import { useState, useCallback } from 'react'
import styles from './seguimiento.module.css'

/**
 * Botón accesible que copia en el portapapeles el enlace de seguimiento
 * de una guía concreta (/seguimiento?guia=...) sin revelar datos personales.
 *
 * Recibe `numeroGuia` como prop serializable desde el Server Component padre.
 */
export default function CopiarEnlace({ numeroGuia }) {
  /** 'idle' | 'copiado' | 'error' */
  const [estado, setEstado] = useState('idle')

  const copiar = useCallback(async () => {
    try {
      // Construimos la URL solo con el número de guía codificado
      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}/seguimiento?guia=${encodeURIComponent(numeroGuia)}`
          : `/seguimiento?guia=${encodeURIComponent(numeroGuia)}`

      await navigator.clipboard.writeText(url)
      setEstado('copiado')
    } catch {
      setEstado('error')
    } finally {
      // Vuelve al estado neutro después de 2.5 s
      setTimeout(() => setEstado('idle'), 2500)
    }
  }, [numeroGuia])

  const label =
    estado === 'copiado'
      ? '¡Enlace copiado!'
      : estado === 'error'
        ? 'No se pudo copiar'
        : 'Copiar enlace'

  return (
    <button
      type="button"
      onClick={copiar}
      className={`${styles.copyBtn} ${estado === 'copiado' ? styles.copyBtnOk : estado === 'error' ? styles.copyBtnErr : ''}`}
      aria-live="polite"
      aria-label={`Copiar enlace de seguimiento para la guía ${numeroGuia}`}
      disabled={estado !== 'idle'}
    >
      {/* Icono accesible */}
      <span className={styles.copyIcon} aria-hidden="true">
        {estado === 'copiado' ? '✓' : estado === 'error' ? '✕' : '⎘'}
      </span>
      <span>{label}</span>
    </button>
  )
}
