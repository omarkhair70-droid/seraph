import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.shell}>
      <div className={styles.field} aria-hidden="true" />
      <section className={styles.copy}>
        <div className={styles.index}>SERAPH://01 · PHASE 00</div>
        <h1>THE BODY<br />COMES FIRST.</h1>
        <p>
          FALL / ASCENT is entering embodiment. The first visible thing in this
          chamber will be a rigged humanoid presence — not a placeholder shape.
        </p>
      </section>
      <div className={styles.status}>
        <span>FOUNDATION</span>
        <span>BODY ACQUISITION NEXT</span>
      </div>
    </main>
  );
}
