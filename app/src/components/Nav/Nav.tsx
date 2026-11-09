import { useSiteStore } from '../../state/useSiteStore';
import styles from './Nav.module.css';

const MOTION_LABELS = ['Calm', 'Dynamic', 'Max'];

export default function Nav() {
  const { theme, toggleTheme, motionLevel, cycleMotionLevel } = useSiteStore();

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>FARHAN</span>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleTheme}
          data-cursor="Toggle"
          aria-label="Switch between day and night mode"
          title="Day / night"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" /><path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
            </svg>
          )}
        </button>
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
