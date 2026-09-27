import styles from './seguimiento.module.css'

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={styles.loadingCard} role="status">Consultando el estado del envío…</div>
    </main>
  )
}
