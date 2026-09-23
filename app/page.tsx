import Link from "next/link";
import styles from "./page.module.css";

const experiences = [
  {
    index: "01",
    eyebrow: "PRESENCE / BODY / SOUND",
    title: "THE BODY",
    href: "/the-body",
    copy: "A cinematic chamber built around posture, proximity, touch and a living digital body.",
  },
  {
    index: "02",
    eyebrow: "ATTENTION / RELIC / AWAKENING",
    title: "WAKING RELIC",
    href: "/waking-relic",
    copy: "A dormant wireframe relic that notices attention, releases itself and crosses into an awake state.",
  },
];

export default function Home() {
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <span>SERAPH</span>
        <span>INTERACTIVE WORLD / 02 EXPERIENCES</span>
      </header>

      <section className={styles.intro}>
        <p className={styles.kicker}>AN ONGOING EXPERIMENTAL WORLD</p>
        <h1>
          TWO ROOMS.
          <br />
          ONE PRESENCE.
        </h1>
        <p className={styles.lede}>
          Enter either experience. Neither replaces the other.
        </p>
      </section>

      <section className={styles.grid} aria-label="SERAPH experiences">
        {experiences.map((experience) => (
          <Link
            className={styles.card}
            href={experience.href}
            key={experience.href}
          >
            <div className={styles.cardTop}>
              <span>{experience.index}</span>
              <span>{experience.eyebrow}</span>
            </div>
            <div>
              <h2>{experience.title}</h2>
              <p>{experience.copy}</p>
            </div>
            <span className={styles.enter}>ENTER EXPERIENCE ↗</span>
          </Link>
        ))}
      </section>

      <footer className={styles.footer}>
        <span>SERAPH://WORLD</span>
        <span>NO SINGLE VERSION IS THE FINAL FORM.</span>
      </footer>
    </main>
  );
}
