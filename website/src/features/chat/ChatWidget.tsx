import { useMemo, useState } from 'react';
import { useSpools } from '../../api/spools';
import { usePreferences } from '../../api/user';
import { useWorkspace } from '../../api/workspace';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { CloseIcon, SpoolIcon } from '../../components/icons';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
import { SpoolCard } from '../inventory/SpoolCard';
import { useChatStream } from './useChatStream';
import styles from './ChatWidget.module.css';
import spinStyles from '../../components/spoolSpin.module.css';

export function ChatWidget() {
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
        <SpoolIcon size={28} className={isStreaming ? spinStyles.spin : undefined} />
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <Text variant="title" as="h2">
              Inventory assistant
            </Text>
            <IconButton
              label="Close chat"
              size="sm"
              icon={<CloseIcon />}
              onClick={() => setIsOpen(false)}
            />
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
                        />
                      ))}
                  </div>
                )}
              </div>
            ))}

            {error && <Alert tone="error">{error}</Alert>}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <TextInput
              className={styles.input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your spools…"
              aria-label="Ask a question"
            />
            <Button type="submit" loading={isStreaming} disabled={!draft.trim()}>
              Send
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
