"use client";

import SeraphWorld from "./SeraphWorld";
import styles from "./SeraphExperience.module.css";

export default function SeraphExperience() {
  return (
    <main className={styles.shell}>
      <div className={styles.world}>
        <SeraphWorld />
      </div>

      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.header}>
        <span>SERARA://01</span>
        <span>PHASE 01 · THE BODY</span>
      </header>

      <div className={styles.caption}>
        <span className={styles.marker}>PRESENCE / BODY / SOUND</span>
        <p>
          Move close. Touch the body. The chamber answers with it.
        </p>
      </div>
    </main>
  );
}
