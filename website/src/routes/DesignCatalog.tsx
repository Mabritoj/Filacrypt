import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { IconButton } from '../components/IconButton';
import {
  ChevronLeftIcon,
  CloseIcon,
  GearIcon,
  MoreIcon,
  NfcIcon,
  SpoolIcon,
  SwapIcon,
} from '../components/icons';
import { ProgressBar } from '../components/ProgressBar';
import { Stat } from '../components/Stat';
import { Text } from '../components/Text';
import styles from './DesignCatalog.module.css';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <Text variant="eyebrow" as="h2" className={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </section>
  );
}

function Catalog() {
  return (
    <>
      <Section title="Text">
        <div className={styles.stack}>
          <Text variant="display">Display</Text>
          <Text variant="h1" as="p">
            Heading 1
          </Text>
          <Text variant="h2" as="p">
            Heading 2
          </Text>
          <Text variant="title" as="p">
            Title
          </Text>
          <Text>Body — Tap a filament roll to your reader and Filacrypt reads the tag.</Text>
          <Text variant="bodySm">Body small</Text>
          <Text variant="meta">Meta</Text>
          <Text variant="label">Label</Text>
          <Text variant="eyebrow" tone="brand">
            Eyebrow
          </Text>
          <div className={styles.row}>
            {(['muted', 'subtle', 'brand', 'warning', 'destructive', 'success'] as const).map(
              (tone) => (
                <Text key={tone} variant="bodySm" tone={tone}>
                  {tone}
                </Text>
              ),
            )}
          </div>
        </div>
      </Section>

      <Section title="Button">
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button size="sm" variant="secondary" icon={<NfcIcon size={14} />}>
            With icon
          </Button>
          <Button loading>Saving…</Button>
          <Button to="/inventory" variant="secondary">
            Router link
          </Button>
          <Button href="#top" variant="ghost">
            Anchor
          </Button>
        </div>
      </Section>

      <Section title="IconButton & icons">
        <div className={styles.row}>
          <IconButton label="Options" variant="outline" icon={<MoreIcon size={18} />} />
          <IconButton label="Close" icon={<CloseIcon />} />
          <IconButton label="Settings" size="sm" icon={<GearIcon size={14} />} />
          <IconButton label="Switch" size="sm" icon={<SwapIcon size={14} />} />
          <IconButton label="Back" size="sm" to="/inventory" icon={<ChevronLeftIcon />} />
          <span className={styles.brandTone}>
            <NfcIcon size={22} />
          </span>
          <span className={styles.brandTone}>
            <SpoolIcon size={28} />
          </span>
          <BrandMark />
          <BrandMark size="sm" />
        </div>
      </Section>

      <Section title="Badge">
        <div className={styles.row}>
          <Badge>PLA</Badge>
          <Badge size="sm">PETG</Badge>
          <Badge tone="warning" size="sm">
            Low
          </Badge>
          <Badge tone="brand">Glitter</Badge>
          <Badge variant="status" tone="success">
            Healthy
          </Badge>
          <Badge variant="status" tone="warning">
            Needs attention
          </Badge>
          <Badge variant="status" tone="success" size="sm">
            Verified
          </Badge>
        </div>
      </Section>

      <Section title="Card & Stat">
        <div className={styles.grid}>
          <Card padding="sm">
            <Stat size="lg" label="Filament remaining" value="1910" unit="g" />
          </Card>
          <Card padding="sm">
            <Stat size="lg" label="Low stock" value={2} tone="warning" />
          </Card>
          <Card padding="sm" tone="sunken">
            <Stat label="Net weight" value="1000 g" />
          </Card>
          <Card padding="sm" tone="sunken">
            <Stat size="sm" label="Last scanned" value="108 days ago" />
          </Card>
        </div>
        <div className={styles.grid}>
          <Card as={Link} to="/inventory" interactive padding="sm">
            <Text variant="title" as="span">
              Interactive card (link)
            </Text>
            <Text variant="meta" as="p">
              Hover me
            </Text>
          </Card>
          <Card tone="accent">
            <Text variant="title" as="span">
              Accent
            </Text>
          </Card>
          <Card tone="destructive" padding="lg">
            <Text variant="title" as="span">
              Destructive, large
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="ProgressBar">
        <div className={styles.stack}>
          <ProgressBar label="Remaining" value={72} />
          <ProgressBar label="Low" value={12} tone="warning" />
          <ProgressBar label="Memory used" value={168} max={316} size="sm" />
        </div>
      </Section>

      <Section title="Alert">
        <div className={styles.stack}>
          <Alert tone="error">Something went wrong loading this spool.</Alert>
          <Alert tone="warning">This spool is running low.</Alert>
          <Alert tone="success">Added to inventory.</Alert>
          <Alert>Tags written by other apps may be missing fields.</Alert>
        </div>
      </Section>
    </>
  );
}

/**
 * Dev-only catalog of the design-system primitives, in both themes side by
 * side. Mounted at /__design only when `import.meta.env.DEV` (see App.tsx),
 * so it never ships. Check it at phone and tablet widths too.
 */
export function DesignCatalog() {
  return (
    <div id="top" className={styles.page}>
      {(['dark', 'light'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className={styles.theme}>
          <Text variant="h1" className={styles.themeTitle}>
            {theme} theme
          </Text>
          <Catalog />
        </div>
      ))}
    </div>
  );
}
