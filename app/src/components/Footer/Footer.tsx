import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.foot}>
      <span>Last updated 9 November 2026</span>
      <span>Built with React, GSAP and Three.js.</span>
    </footer>
  );
}
