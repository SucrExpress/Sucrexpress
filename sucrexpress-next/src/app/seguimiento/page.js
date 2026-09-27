import Link from 'next/link'
import styles from './seguimiento.module.css'

export const metadata = {
  title: 'Seguimiento de envíos | SucreExpress',
  description: 'Consulta el estado de tu envío con tu número de guía.',
}

const etapas = [
  { estado: 'pendiente', nombre: 'Registrado', detalle: 'Recibimos los datos de tu envío.' },
  { estado: 'asignado', nombre: 'Asignado', detalle: 'Un repartidor aceptó el paquete.' },
  { estado: 'en_ruta', nombre: 'En ruta', detalle: 'Tu paquete está en camino.' },
  { estado: 'entregado', nombre: 'Entregado', detalle: 'La entrega se completó.' },
]

function fechaLegible(valor) {
  if (!valor) return 'Aún no disponible'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Aún no disponible'
  return fecha.toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  })
}

async function consultarGuia(guia) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(guia)) {
    return { tipo: 'invalida' }
  }

  const base = (process.env.NEST_API_URL || process.env.NEXT_PUBLIC_NEST_API_URL || 'http://localhost:3001').replace(/\/$/, '')

  try {
    const respuesta = await fetch(`${base}/api/paquetes/seguimiento/${encodeURIComponent(guia)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (respuesta.status === 404) return { tipo: 'no-encontrada' }
    if (!respuesta.ok) return { tipo: 'error' }

    const resultado = await respuesta.json()
    if (!resultado.success || !resultado.data) return { tipo: 'error' }
    return { tipo: 'encontrada', paquete: resultado.data }
  } catch {
    return { tipo: 'error' }
  }
}

export default async function SeguimientoPage({ searchParams }) {
  const parametros = await searchParams
  const guia = typeof parametros.guia === 'string' ? parametros.guia.trim() : ''
  const consultado = Object.hasOwn(parametros, 'guia')
  const resultado = consultado ? await consultarGuia(guia) : null
  const paquete = resultado?.tipo === 'encontrada' ? resultado.paquete : null
  const estado = paquete?.estado?.toLowerCase()
  const etapaActual = etapas.findIndex((etapa) => etapa.estado === estado)

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/seguimiento" className={styles.brand} aria-label="SucreExpress, inicio de seguimiento">
            <span className={styles.brandIcon} aria-hidden="true">S</span>
            <span>Sucre<span className={styles.brandAccent}>Express</span></span>
          </Link>
          <Link href="/login" className={styles.adminLink}>Acceso al panel <span aria-hidden="true">↗</span></Link>
        </header>

        <div className={styles.content}>
          <section className={styles.hero} aria-labelledby="titulo-seguimiento">
            <span className={styles.eyebrow}>CONSULTA DE ENVÍOS</span>
            <h1 id="titulo-seguimiento">Sigue tu paquete<br /><span>en cada paso.</span></h1>
            <p>Ingresa el número de guía que recibiste al registrar tu envío. Verás su estado más reciente sin iniciar sesión.</p>

            <form action="/seguimiento" method="get" className={styles.searchForm}>
              <label htmlFor="guia">Número de guía</label>
              <div className={styles.searchRow}>
                <input
                  id="guia"
                  name="guia"
                  type="text"
                  defaultValue={guia}
                  placeholder="Ej. GS-1720000000000-123"
                  autoComplete="off"
                  minLength={3}
                  maxLength={64}
                  required
                />
                <button type="submit">Consultar <span aria-hidden="true">→</span></button>
              </div>
              <span className={styles.hint}>El número de guía figura en el comprobante de tu envío.</span>
            </form>
          </section>

          <section className={styles.resultArea} aria-live="polite">
            {!consultado && (
              <div className={styles.emptyCard}>
                <span className={styles.emptyIcon} aria-hidden="true">↗</span>
                <h2>Tu envío, a la vista</h2>
                <p>Escribe tu número de guía para ver la información actualizada del paquete.</p>
              </div>
            )}

            {resultado?.tipo === 'invalida' && (
              <div className={styles.messageCard} role="alert">
                <h2>Revisa el número de guía</h2>
                <p>Debe tener entre 3 y 64 caracteres. Usa letras, números, guiones, puntos o guiones bajos.</p>
              </div>
            )}

            {resultado?.tipo === 'no-encontrada' && (
              <div className={styles.messageCard} role="status">
                <h2>No encontramos ese envío</h2>
                <p>Comprueba el número de guía e inténtalo de nuevo. La búsqueda debe coincidir exactamente con tu comprobante.</p>
              </div>
            )}

            {resultado?.tipo === 'error' && (
              <div className={styles.messageCard} role="alert">
                <h2>No pudimos consultar tu envío</h2>
                <p>El servicio no está disponible en este momento. Vuelve a intentarlo en unos minutos.</p>
              </div>
            )}

            {paquete && (
              <article className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <div>
                    <span className={styles.cardLabel}>NÚMERO DE GUÍA</span>
                    <h2>{paquete.numero_guia}</h2>
                  </div>
                  <span className={`${styles.statusBadge} ${estado === 'fallido' ? styles.statusBadgeWarning : ''}`}>
                    {estado === 'fallido' ? 'Entrega no completada' : etapas[etapaActual]?.nombre || 'Estado en revisión'}
                  </span>
                </div>

                {estado === 'fallido' ? (
                  <p className={styles.incident}>La entrega no pudo completarse. Contacta a SucreExpress e indica tu número de guía para recibir ayuda.</p>
                ) : etapaActual >= 0 ? (
                  <ol className={styles.timeline} aria-label="Progreso del envío">
                    {etapas.map((etapa, indice) => (
                      <li key={etapa.estado} className={indice <= etapaActual ? styles.completed : styles.pending}>
                        <span className={styles.stepDot} aria-hidden="true">{indice < etapaActual ? '✓' : indice + 1}</span>
                        <div>
                          <strong>{etapa.nombre}</strong>
                          <span>{etapa.detalle}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.incident}>El estado de este envío se está verificando. Intenta consultarlo más tarde.</p>
                )}

                <div className={styles.details}>
                  <div><span>Ciudad de destino</span><strong>{paquete.ciudad_destino || 'No disponible'}</strong></div>
                  <div><span>Registrado</span><strong>{fechaLegible(paquete.created_at)}</strong></div>
                  {paquete.fecha_asignacion && <div><span>Asignado</span><strong>{fechaLegible(paquete.fecha_asignacion)}</strong></div>}
                  <div><span>Última actualización</span><strong>{fechaLegible(paquete.updated_at)}</strong></div>
                  {paquete.fecha_entrega && <div><span>Entregado</span><strong>{fechaLegible(paquete.fecha_entrega)}</strong></div>}
                </div>
                <p className={styles.privacyNote}>Por privacidad, esta consulta no muestra datos personales ni la dirección exacta de entrega.</p>
              </article>
            )}
          </section>
        </div>

        <footer className={styles.footer}>SucreExpress · Sucre, Bolivia <span>Seguimiento de envíos</span></footer>
      </div>
    </main>
  )
}
