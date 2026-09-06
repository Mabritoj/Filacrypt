import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpools } from '../../api/spools';
import { usePreferences } from '../../api/user';
import { useWorkspace } from '../../api/workspace';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { SpoolCard } from '../inventory/SpoolCard';
import { useChatStream } from './useChatStream';
import styles from './ChatWidget.module.css';
import spinStyles from '../../components/spoolSpin.module.css';

export function ChatWidget() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId() ?? '';
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const { messages, isStreaming, error, send } = useChatStream(workspaceId);
  const spoolsQuery = useSpools(workspaceId);
  const workspaceQuery = useWorkspace(workspaceId);
  const preferences = usePreferences();

  // The stream carries only spool ids -- the cards come out of the TanStack
  // Query cache the inventory page already populated, so nothing extra is fetched.
  const spoolsById = useMemo(
    () => new Map((spoolsQuery.data ?? []).map((spool) => [spool.id, spool])),
    [spoolsQuery.data],
  );

  const lowStockThresholdG = workspaceQuery.data?.lowStockThresholdG ?? 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft;
    setDraft('');
    void send(text);
  }

  return (
    <>
      <button
        type="button"
        className={styles.badge}
        data-open={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close inventory assistant chat' : 'Open inventory assistant chat'}
      >
        <svg
          className={isStreaming ? spinStyles.spin : undefined}
          width={28}
          height={28}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx={12} cy={12} r={10} stroke="var(--color-border-strong)" strokeWidth={1} />
          <circle
            cx={12}
            cy={12}
            r={8.5}
            stroke="var(--color-brand-ink)"
            strokeOpacity={0.9}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeDasharray="3 2"
          />
          <circle
            cx={12}
            cy={12}
            r={7}
            stroke="var(--color-brand-ink)"
            strokeOpacity={0.7}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeDasharray="3 2"
            strokeDashoffset={1.5}
          />
          <circle
            cx={12}
            cy={12}
            r={5.5}
            stroke="var(--color-brand-ink)"
            strokeOpacity={0.5}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeDasharray="2.5 2"
            strokeDashoffset={0.8}
          />
          <circle
            cx={12}
            cy={12}
            r={4}
            stroke="var(--color-brand-ink)"
            strokeOpacity={0.35}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeDasharray="2 1.5"
            strokeDashoffset={1.2}
          />
          <circle cx={12} cy={12} r={2} fill="var(--color-brand-ink)" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>Inventory assistant</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className={styles.log}>
            {messages.length === 0 && (
              <p className={styles.empty}>
                Try &ldquo;what black filament do I have?&rdquo; or &ldquo;am I low on
                anything?&rdquo;
              </p>
            )}

            {messages.map((message, index) => (
              <div key={index} className={message.role === 'user' ? styles.user : styles.assistant}>
                {message.text}
                {message.spoolIds.length > 0 && (
                  <div className={styles.cards}>
                    {message.spoolIds
                      .map((id) => spoolsById.get(id))
                      .filter((spool) => spool !== undefined)
                      .map((spool) => (
                        <SpoolCard
                          key={spool.id}
                          spool={spool}
                          lowStockThresholdG={lowStockThresholdG}
                          weightUnit={preferences.weightUnit}
                          onClick={() => navigate(`/inventory/${spool.id}`)}
                        />
                      ))}
                  </div>
                )}
              </div>
            ))}

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your spools…"
              aria-label="Ask a question"
            />
            <button type="submit" className={styles.send} disabled={isStreaming || !draft.trim()}>
              {isStreaming ? '…' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
