import type { ReactNode } from 'react';
import { useRovingSelection } from '../hooks/useRovingSelection';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /**
   * Ties each tab to its panel: pass the same value to the matching
   * `<TabPanel tabsId>`. Without it the tabs still work, just unlinked.
   */
  id?: string;
  /** Accessible name for the tab list, when the page heading doesn't already give context. */
  'aria-label'?: string;
}

const tabId = (tabsId: string, id: string) => `${tabsId}-tab-${id}`;
const panelId = (tabsId: string, id: string) => `${tabsId}-panel-${id}`;

/**
 * A tab list. Tab reaches the active tab; Left/Right/Home/End switch tabs
 * (selection follows focus). Render the active panel with TabPanel.
 */
export function Tabs({ tabs, activeId, onChange, id, 'aria-label': ariaLabel }: TabsProps) {
  const { onKeyDown, itemProps } = useRovingSelection(
    tabs.map((tab) => tab.id),
    activeId,
    onChange,
    'horizontal',
  );

  return (
    <div className={styles.tablist} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={id && tabId(id, tab.id)}
          aria-controls={id && panelId(id, tab.id)}
          aria-selected={tab.id === activeId}
          className={styles.tab}
          onClick={() => onChange(tab.id)}
          {...itemProps(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export interface TabPanelProps {
  /** The `id` given to the Tabs this panel belongs to. */
  tabsId: string;
  /** The tab this panel shows. */
  tabId: string;
  children: ReactNode;
}

/** The content for one tab. Render only the active tab's panel. */
export function TabPanel({ tabsId, tabId: id, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={panelId(tabsId, id)}
      aria-labelledby={tabId(tabsId, id)}
      // Lets keyboard users move from the tab straight into panels whose
      // first content isn't focusable (per the ARIA tabs pattern).
      tabIndex={0}
    >
      {children}
    </div>
  );
}
