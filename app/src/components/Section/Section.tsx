import { forwardRef, type ReactNode } from 'react';
import styles from './Section.module.css';

type Wash = 'steel' | 'lav' | 'bronze' | 'accent';

interface SectionProps {
  id: string;
  wash: Wash;
  eyebrow?: string;
  title: string;
  sub?: string;
  children: ReactNode;
  headExtra?: ReactNode;
}

const Section = forwardRef<HTMLElement, SectionProps>(
  ({ id, wash, eyebrow, title, sub, children, headExtra }, ref) => (
    <section ref={ref} id={id} className={`${styles.sec} ${styles[wash]}`}>
      <div className={styles.head} data-reveal>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h2 className={styles.title}>{title}</h2>
        {sub && <p className={styles.sub}>{sub}</p>}
        {headExtra}
      </div>
      {children}
    </section>
  ),
);
Section.displayName = 'Section';

export default Section;
