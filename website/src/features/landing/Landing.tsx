import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import styles from './Landing.module.css';

interface Step {
  n: string;
  title: string;
  body: string;
}

interface Feature {
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    n: '1',
    title: 'Tap the tag',
    body: 'Hold any NFC-tagged spool to your reader. Filacrypt reads the OpenPrintTag instantly.',
  },
  {
    n: '2',
    title: 'Track what’s left',
    body: 'Weight, length and percentage stay current as you print — no manual math.',
  },
  {
    n: '3',
    title: 'Reorder in a click',
    body: 'Running low? Jump straight to the product page for the exact spool.',
  },
];

const features: Feature[] = [
  {
    title: 'Live remaining',
    body: 'See grams, meters and percentage left on every spool at a glance.',
  },
  { title: 'Low-stock alerts', body: 'Get flagged before a roll runs out mid-print.' },
  { title: 'Drying reminders', body: 'Track which materials need drying and at what temperature.' },
  {
    title: 'Print settings on hand',
    body: 'Nozzle, bed, chamber and flow — read from the tag, ready when you slice.',
  },
  { title: 'Light & dark', body: 'A calm interface that suits your workshop, day or night.' },
  {
    title: 'Your whole shelf',
    body: 'Search and filter by brand, material and color across your inventory.',
  },
];

const fields: string[] = [
  'Brand & material',
  'Color & finish',
  'Net / spool weight',
  'Nozzle / bed temps',
  'Drying profile',
];

export function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    fetchAuthSession()
      .then((session) => {
        if (!cancelled && session?.tokens) {
          navigate('/inventory', { replace: true });
        }
      })
      .catch(() => {
        // No session, or the check failed -- stay on the marketing page.
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className={styles.page}>
      <div className={`app-container ${styles.container}`}>
        <header className={styles.nav}>
          <div className={styles.navBrand}>
            <div className={styles.navMark}>F</div>
            <span className={styles.navName}>Filacrypt</span>
          </div>
          <nav className={styles.navLinks}>
            <a className={styles.navLink} href="#how">
              How it works
            </a>
            <a className={styles.navLink} href="#features">
              Features
            </a>
            <a className={styles.navLink} href="#standard">
              OpenPrintTag
            </a>
            <Link className={styles.navSignIn} to="/inventory">
              Sign in
            </Link>
            <Link className={styles.navCta} to="/inventory">
              Get started
            </Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <div>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              NFC-NATIVE · OPENPRINTTAG
            </div>
            <h1 className={styles.heroTitle}>
              Every spool,
              <br />
              tracked to the gram.
            </h1>
            <p className={styles.heroSubtitle}>
              Tap a filament roll to your reader and Filacrypt reads the tag, logs what&apos;s left,
              and remembers every setting. No spreadsheets, no guessing.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.btnPrimary} to="/inventory">
                Start your inventory
              </Link>
              <a className={styles.btnSecondary} href="#how">
                See how it works
              </a>
            </div>
            <div className={styles.heroNote}>Works with any NFC-tagged spool</div>
          </div>

          <div className={styles.spoolCard}>
            <SpoolIllustration />
            <div className={styles.spoolInfo}>
              <div>
                <div className={styles.spoolName}>Galaxy Black</div>
                <div className={styles.spoolMeta}>Prusament · PLA</div>
              </div>
              <div className={styles.spoolStats}>
                <div className={styles.spoolPercent}>72%</div>
                <div className={styles.spoolWeight}>720 g left</div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className={styles.howSection}>
          <div className={styles.eyebrow}>HOW IT WORKS</div>
          <h2 className={styles.sectionTitle}>Three taps from roll to record.</h2>
          <div className={styles.stepsGrid}>
            {steps.map((step) => (
              <div key={step.n} className={styles.stepCard}>
                <div className={styles.stepNumber}>{step.n}</div>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepBody}>{step.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className={styles.featuresSection}>
          <div className={styles.eyebrow}>FEATURES</div>
          <h2 className={styles.sectionTitle}>Built for the way you actually print.</h2>
          <div className={styles.featuresGrid}>
            {features.map((feature) => (
              <div key={feature.title} className={styles.featureCard}>
                <div className={styles.featureTitle}>{feature.title}</div>
                <div className={styles.featureBody}>{feature.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="standard" className={styles.standardBand}>
          <div>
            <div className={styles.eyebrow}>OPEN STANDARD</div>
            <h2 className={styles.standardTitle}>Powered by OpenPrintTag.</h2>
            <p className={styles.standardBody}>
              Filacrypt reads the open OpenPrintTag standard, so brand, material, color,
              temperatures, weight and drying data all come straight off the tag — no vendor
              lock-in, no manual entry.
            </p>
          </div>
          <div className={styles.fieldsList}>
            {fields.map((field) => (
              <div key={field} className={styles.fieldItem}>
                <span className={styles.fieldBullet}>▸</span>
                {field}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <h2 className={styles.finalCtaTitle}>Know exactly what&apos;s on your shelf.</h2>
          <p className={styles.finalCtaBody}>Start tracking your filament in minutes.</p>
          <Link className={`${styles.btnPrimary} ${styles.finalCtaButton}`} to="/inventory">
            Get started
          </Link>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <div className={styles.footerMark}>F</div>
            <span className={styles.footerName}>Filacrypt · filacrypt.com</span>
          </div>
          <a className={styles.footerLink} href="#how">
            Back to top ›
          </a>
        </footer>
      </div>
    </div>
  );
}

function SpoolIllustration() {
  return (
    <svg width={300} height={300} viewBox="0 0 230 230" aria-hidden="true">
      <defs>
        <radialGradient id="lflange" cx="42%" cy="36%" r="78%">
          <stop offset="0%" stopColor="#322e27" />
          <stop offset="100%" stopColor="#181510" />
        </radialGradient>
      </defs>
      <circle
        cx={115}
        cy={115}
        r={104}
        fill="url(#lflange)"
        stroke="rgba(255,255,255,.09)"
        strokeWidth={2}
      />
      <circle cx={115} cy={115} r={95} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={1.5} />
      <circle cx={115} cy={115} r={64} fill="none" stroke="#120f09" strokeWidth={48} />
      <circle cx={115} cy={115} r={79} fill="none" stroke="#cf9161" strokeWidth={30} />
      <g stroke="rgba(0,0,0,.22)" strokeWidth={1} fill="none">
        <circle cx={115} cy={115} r={70} />
        <circle cx={115} cy={115} r={78} />
        <circle cx={115} cy={115} r={86} />
      </g>
      <circle
        cx={115}
        cy={115}
        r={94}
        fill="none"
        stroke="rgba(255,255,255,.24)"
        strokeWidth={1.5}
      />
      <circle
        cx={115}
        cy={115}
        r={40}
        fill="#241f19"
        stroke="rgba(255,255,255,.1)"
        strokeWidth={2}
      />
      <g fill="#17130d">
        <circle cx={115} cy={88} r={4.5} />
        <circle cx={138.5} cy={128.5} r={4.5} />
        <circle cx={91.5} cy={128.5} r={4.5} />
      </g>
      <circle
        cx={115}
        cy={115}
        r={16}
        fill="#0d0c0b"
        stroke="rgba(255,255,255,.08)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
