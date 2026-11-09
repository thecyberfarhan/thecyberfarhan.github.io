import { useSiteStore } from '../../state/useSiteStore';
import styles from './Nav.module.css';

const MOTION_LABELS = ['Calm', 'Dynamic', 'Max'];

const LINKS = [
  ['Proof', '#proof'],
  ['About', '#about'],
  ['Tools', '#tools'],
  ['Projects', '#projects'],
];

export default function Nav() {
  const { motionLevel, cycleMotionLevel } = useSiteStore();

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>FARHAN</span>
      <ul className={styles.links}>
        {LINKS.map(([label, href]) => (
          <li key={href}><a href={href} data-cursor="Go">{label}</a></li>
        ))}
      </ul>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.motionDial}
          data-level={motionLevel}
          onClick={cycleMotionLevel}
          data-cursor="Motion"
          aria-label={`Motion level: ${MOTION_LABELS[motionLevel]}. Click to change.`}
          title="Motion level"
        >
          <span className={styles.motionBar} />
          <span className={styles.motionBar} />
          <span className={styles.motionBar} />
          <span className={styles.motionLabel}>{MOTION_LABELS[motionLevel]}</span>
        </button>
      </div>
    </nav>
  );
}
