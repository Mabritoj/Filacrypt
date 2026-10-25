import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupProfile } from '../../api/user';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Field } from '../../components/Field';
import { PageShell } from '../../components/PageShell';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
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
        <Card as="form" padding="none" className={styles.card} onSubmit={handleSubmit}>
          <div>
            <Text variant="h1">Welcome to Filacrypt</Text>
            <Text tone="muted" className={styles.subtitle}>
              Let&apos;s set up your profile.
            </Text>
          </div>

          <Field label="Name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </Field>

          <Field label="Username">
            <TextInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </Field>

          {setupProfile.isError && <ErrorMessage message={setupProfile.error.message} />}

          <Button type="submit" loading={setupProfile.isPending}>
            {setupProfile.isPending ? 'Setting up…' : 'Continue'}
          </Button>
        </Card>
      </div>
    </PageShell>
  );
}
