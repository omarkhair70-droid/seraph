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

      <header className={styles.header}>
        <span>SERAPH://01</span>
        <span>PHASE 01 · THE BODY</span>
      </header>

      <div className={styles.caption}>
        <span className={styles.marker}>PRESENCE / 01</span>
        <p>
          Before it can fall, it has to feel alive while standing still.
        </p>
      </div>
    </main>
  );
}
