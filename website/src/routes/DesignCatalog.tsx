import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Checkbox } from '../components/Checkbox';
import { ColorInput } from '../components/ColorInput';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Field } from '../components/Field';
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
import { Menu, MenuGroup, MenuItem } from '../components/Menu';
import { Modal } from '../components/Modal';
import { NumberInput } from '../components/NumberInput';
import { Popover } from '../components/Popover';
import { ProgressBar } from '../components/ProgressBar';
import { SegmentedControl } from '../components/SegmentedControl';
import { Select } from '../components/Select';
import { Stat } from '../components/Stat';
import { Switch } from '../components/Switch';
import { TabPanel, Tabs } from '../components/Tabs';
import { Text } from '../components/Text';
import { TextInput } from '../components/TextInput';
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

function FormControls({ idPrefix }: { idPrefix: string }) {
  const [unit, setUnit] = useState<'g' | 'kg'>('g');
  const [color, setColor] = useState('#cf9161');
  const [lowOnly, setLowOnly] = useState(false);
  const [emails, setEmails] = useState(true);
  const [tab, setTab] = useState('general');

  return (
    <>
      <div className={styles.grid}>
        <Field label="Name" hint="Shown to your workspace">
          <TextInput placeholder="Morgan Reyes" />
        </Field>
        <Field label="Username" error="That username is taken">
          <TextInput defaultValue="morgan" />
        </Field>
        <Field label="Low-stock alert below">
          <NumberInput unit="grams" defaultValue={150} />
        </Field>
        <Field label="Status">
          <Select defaultValue="in_use">
            <option value="in_use">In use</option>
            <option value="stored">Stored</option>
          </Select>
        </Field>
        <Field label="Color">
          <ColorInput value={color} onChange={setColor} />
        </Field>
        <Field label="Bed temp (small)">
          <NumberInput size="sm" defaultValue={60} />
        </Field>
      </div>
      <div className={styles.row}>
        <SegmentedControl
          label="Weight unit"
          value={unit}
          onChange={setUnit}
          options={[
            { value: 'g', label: 'Grams' },
            { value: 'kg', label: 'Kilograms' },
          ]}
        />
      </div>
      <div className={styles.row}>
        <Checkbox checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)}>
          Only show low stock
        </Checkbox>
        <Switch checked={emails} onChange={(event) => setEmails(event.target.checked)}>
          Low-stock emails
        </Switch>
      </div>
      <Tabs
        id={`${idPrefix}-tabs`}
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'members', label: 'Members' },
        ]}
        activeId={tab}
        onChange={setTab}
      />
      <TabPanel tabsId={`${idPrefix}-tabs`} tabId={tab}>
        <Text variant="bodySm">Panel for {tab}. Arrow keys switch tabs.</Text>
      </TabPanel>
    </>
  );
}

function Overlays() {
  const [confirming, setConfirming] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dark, setDark] = useState(true);

  return (
    <div className={styles.row}>
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Open confirm
      </Button>
      {confirming && (
        <ConfirmDialog
          title="Delete this spool?"
          confirmLabel="Delete"
          onConfirm={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        >
          <p>This can&apos;t be undone. Escape cancels; a backdrop click doesn&apos;t.</p>
        </ConfirmDialog>
      )}
      <Button variant="secondary" onClick={() => setInfoOpen(true)}>
        Open modal
      </Button>
      {infoOpen && (
        <Modal title="About tags" closeOnBackdropClick onCancel={() => setInfoOpen(false)}>
          <p>Escape or a backdrop click closes this one.</p>
        </Modal>
      )}
      <Menu
        label="Spool options"
        align="start"
        trigger={(triggerProps) => (
          <IconButton
            {...triggerProps}
            label="Spool options"
            variant="outline"
            icon={<MoreIcon size={18} />}
          />
        )}
      >
        <MenuGroup>
          <MenuItem>Edit spool</MenuItem>
          <MenuItem to="/inventory">Inventory</MenuItem>
          <MenuItem checked={dark} onClick={() => setDark((value) => !value)}>
            Dark mode
          </MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem tone="destructive">Delete spool</MenuItem>
        </MenuGroup>
      </Menu>
      <Popover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        label="Filters"
        align="start"
        trigger={(triggerProps) => (
          <Button {...triggerProps} variant="secondary">
            Filters
          </Button>
        )}
      >
        <div className={styles.popoverBody}>
          <Text variant="title" as="p">
            Filters
          </Text>
          <Checkbox defaultChecked>Only show low stock</Checkbox>
          <Button onClick={() => setPopoverOpen(false)}>Apply filters</Button>
        </div>
      </Popover>
    </div>
  );
}

function Catalog({ idPrefix }: { idPrefix: string }) {
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

      <Section title="Form controls">
        <FormControls idPrefix={idPrefix} />
      </Section>

      <Section title="Overlays">
        <Overlays />
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
          <Catalog idPrefix={theme} />
        </div>
      ))}
    </div>
  );
}
