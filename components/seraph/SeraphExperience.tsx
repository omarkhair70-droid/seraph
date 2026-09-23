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
        <span>THE BODY · CINEMATIC CHAMBER</span>
      </header>

      <div className={styles.caption}>
        <span className={styles.marker}>PRESENCE / RITUAL / SOUND</span>
        <p>
          Move close. Touch once to wake the chamber. Stay long enough and it answers differently.
        </p>
      </div>
    </main>
  );
}
