import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupProfile } from '../../api/user';
import { PageShell } from '../../components/PageShell';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/ErrorMessage';
import styles from './Setup.module.css';

export function Setup() {
  const navigate = useNavigate();
  const setupProfile = useSetupProfile();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await setupProfile.mutateAsync({ name, username });
      navigate('/inventory');
    } catch {
      // Error is already captured in setupProfile.error and displayed via isError
    }
  }

  return (
    <PageShell>
      <div className={styles.wrapper}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Welcome to Filacrypt</h1>
          <p className={styles.subtitle}>Let&apos;s set up your profile.</p>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Username</span>
            <input
              className={styles.input}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          {setupProfile.isError && <ErrorMessage message={setupProfile.error.message} />}

          <Button type="submit" disabled={setupProfile.isPending}>
            {setupProfile.isPending ? 'Setting up…' : 'Continue'}
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
