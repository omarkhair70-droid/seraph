"use client";

import SeraphWorld from "./SeraphWorld";
import SeraraPerceptionSensor from "./SeraraPerceptionSensor";
import styles from "./SeraphExperience.module.css";

export default function SeraphExperience() {
  return (
    <main className={styles.shell}>
      <SeraraPerceptionSensor />
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
      </div>
    </main>
  );
}
