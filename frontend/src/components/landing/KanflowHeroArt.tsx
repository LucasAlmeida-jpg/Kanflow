import styles from "./landing.module.css";

export function KanflowHeroArt() {
  return (
    <svg className={styles["hero-art"]} viewBox="0 0 680 300" role="img" aria-label="Um quadro com três colunas, um card sendo arrastado e os cursores de duas pessoas editando ao mesmo tempo">
      <circle className={styles["art-soft"]} cx="70" cy="200" r="46" />
      <circle className={styles["art-brand"]} cx="40" cy="96" r="10" />
      <rect className={styles["art-ring"]} x="590" y="40" width="44" height="44" rx="12" transform="rotate(14 612 62)" />
      <rect className={styles["art-brand"]} x="600" y="210" width="56" height="20" rx="10" transform="rotate(-18 628 220)" />
      <circle className={styles["art-accent"]} cx="632" cy="138" r="7" />

      <rect className={styles["art-column"]} x="130" y="30" width="130" height="236" rx="14" />
      <rect className={styles["art-column"]} x="275" y="30" width="130" height="236" rx="14" />
      <rect className={styles["art-column"]} x="420" y="30" width="130" height="236" rx="14" />

      <rect className={styles["art-label"]} x="144" y="46" width="56" height="8" rx="4" />
      <rect className={styles["art-label"]} x="289" y="46" width="72" height="8" rx="4" />
      <rect className={styles["art-label"]} x="434" y="46" width="44" height="8" rx="4" />

      <rect className={styles["art-card"]} x="142" y="66" width="106" height="44" rx="8" />
      <rect className={styles["art-line"]} x="154" y="80" width="70" height="6" rx="3" />
      <rect className={styles["art-line"]} x="154" y="92" width="44" height="6" rx="3" />
      <rect className={styles["art-card"]} x="142" y="118" width="106" height="36" rx="8" />
      <rect className={styles["art-line"]} x="154" y="132" width="60" height="6" rx="3" />
      <rect className={styles["art-card"]} x="142" y="162" width="106" height="44" rx="8" />
      <rect className={styles["art-line"]} x="154" y="176" width="80" height="6" rx="3" />
      <rect className={styles["art-line"]} x="154" y="188" width="36" height="6" rx="3" />

      <rect className={styles["art-card"]} x="287" y="66" width="106" height="36" rx="8" />
      <rect className={styles["art-line"]} x="299" y="80" width="64" height="6" rx="3" />
      <rect className={styles["art-card-brand"]} x="287" y="110" width="106" height="44" rx="8" />
      <rect className={styles["art-line-on-brand"]} x="299" y="124" width="72" height="6" rx="3" />
      <rect className={styles["art-line-on-brand"]} x="299" y="136" width="40" height="6" rx="3" />

      <rect className={styles["art-card"]} x="432" y="66" width="106" height="36" rx="8" />
      <rect className={styles["art-line"]} x="444" y="80" width="52" height="6" rx="3" />
      <rect className={styles["art-drop"]} x="432" y="110" width="106" height="44" rx="8" />

      <g transform="rotate(-6 420 196)">
        <rect className={styles["art-shadow"]} x="372" y="180" width="106" height="44" rx="8" />
        <rect className={styles["art-card-lifted"]} x="366" y="172" width="106" height="44" rx="8" />
        <rect className={styles["art-line"]} x="378" y="186" width="66" height="6" rx="3" />
        <rect className={styles["art-line"]} x="378" y="198" width="38" height="6" rx="3" />
      </g>

      <g transform="translate(452 204)">
        <path className={styles["art-cursor-brand"]} d="M0 0 L0 22 L6 16 L11 27 L15 25 L10 14 L18 14 Z" />
        <rect className={styles["art-cursor-brand"]} x="16" y="26" width="40" height="20" rx="10" />
        <text className={styles["art-cursor-text"]} x="36" y="40" textAnchor="middle">Ana</text>
      </g>

      <g transform="translate(232 222)">
        <path className={styles["art-cursor-info"]} d="M0 0 L0 22 L6 16 L11 27 L15 25 L10 14 L18 14 Z" />
        <rect className={styles["art-cursor-info"]} x="16" y="26" width="50" height="20" rx="10" />
        <text className={styles["art-cursor-text-info"]} x="41" y="40" textAnchor="middle">Lucas</text>
      </g>
    </svg>
  );
}
