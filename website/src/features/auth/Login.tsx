import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn, confirmSignIn } from 'aws-amplify/auth';
import { CodeInput } from './CodeInput';
import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Field } from '../../components/Field';
import { ChevronLeftIcon } from '../../components/icons';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
import styles from './Login.module.css';

const RESEND_COOLDOWN_SECONDS = 30;

type Step = 'email' | 'code';

interface LocationState {
  from?: { pathname: string };
}

function errorMessageFor(err: unknown): string {
  const name = (err as { name?: string } | undefined)?.name;
  if (name === 'UserNotFoundException') return 'No account found for that email.';
  if (name === 'CodeMismatchException' || name === 'ExpiredCodeException') {
    return "That code's wrong or expired. Try again.";
  }
  return 'Something went wrong. Please try again.';
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (step !== 'code') return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  async function requestCode(targetEmail: string) {
    await signIn({
      username: targetEmail,
      options: { authFlowType: 'USER_AUTH', preferredChallenge: 'EMAIL_OTP' },
    });
    setCode('');
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    setStep('code');
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();
    setEmail(normalizedEmail);
    try {
      await requestCode(normalizedEmail);
    } catch (err) {
      setError(errorMessageFor(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await requestCode(email);
    } catch (err) {
      setError(errorMessageFor(err));
    }
  }

  async function handleCodeComplete(fullCode: string) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await confirmSignIn({ challengeResponse: fullCode });
      if (result.nextStep.signInStep === 'DONE') {
        const state = location.state as LocationState | null;
        navigate(state?.from?.pathname ?? '/inventory', { replace: true });
      }
    } catch (err) {
      setError(errorMessageFor(err));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleUseDifferentEmail() {
    setStep('email');
    setCode('');
    setError(null);
  }

  return (
    // Always dark, whatever the app theme: the data-theme subtree gives this
    // page's own styles and shared components (Button, ErrorMessage) the dark
    // tokens without touching the user's actual theme.
    <div className={styles.page} data-theme="dark">
      <div className={styles.card}>
        <div className={styles.brandPanel}>
          <Link to="/" className={styles.brandLink}>
            <BrandMark />
            <span className={styles.brandName}>Filacrypt</span>
          </Link>

          <div className={styles.illustration}>
            <svg viewBox="0 0 230 230" aria-hidden="true">
              <defs>
                <radialGradient id="loginSpoolFlange" cx="42%" cy="36%" r="78%">
                  <stop offset="0%" stopColor="var(--spool-flange-from)" />
                  <stop offset="100%" stopColor="var(--spool-flange-to)" />
                </radialGradient>
              </defs>
              <circle
                cx={115}
                cy={115}
                r={104}
                fill="url(#loginSpoolFlange)"
                stroke="rgba(255,255,255,.09)"
                strokeWidth={2}
              />
              <circle
                cx={115}
                cy={115}
                r={64}
                fill="none"
                stroke="var(--spool-core)"
                strokeWidth={48}
              />
              <circle
                cx={115}
                cy={115}
                r={79}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth={30}
              />
              <g stroke="rgba(0,0,0,.22)" strokeWidth={1} fill="none">
                <circle cx={115} cy={115} r={70} />
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
                r={16}
                fill="var(--spool-core)"
                stroke="rgba(255,255,255,.08)"
                strokeWidth={1.5}
              />
              <path
                d="M155 78a52 52 0 0 1 0 36"
                stroke="var(--color-brand)"
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
                opacity={0.8}
              />
              <path
                d="M168 66a70 70 0 0 1 0 60"
                stroke="var(--color-brand)"
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
                opacity={0.4}
              />
            </svg>
            <div className={styles.illustrationCaption}>
              <div className={styles.illustrationTitle}>No passwords here</div>
              <p className={styles.illustrationBody}>
                Just like a spool&apos;s tag, your sign-in is quick and secure — no password to
                remember.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.formPanel}>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit}>
              <Text variant="h1" className={styles.title}>
                Welcome back
              </Text>
              <Text variant="bodySm" tone="muted" className={styles.subtitle}>
                No password to remember — we&apos;ll email you a one-time code.
              </Text>
              <Field label="Email" className={styles.field}>
                <TextInput
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              {error && <ErrorMessage message={error} />}
              <Button type="submit" className={styles.submitButton} loading={submitting}>
                {submitting ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          ) : (
            <div>
              <Text variant="h1" className={styles.title}>
                Enter your code
              </Text>
              <Text variant="bodySm" tone="muted" className={styles.subtitle}>
                We sent an 8-digit code to {email}. It expires shortly.
              </Text>
              {error && <ErrorMessage message={error} />}
              {/* Cognito's sign-in email OTP is fixed at 8 digits (unlike its
                  6-digit sign-up OTP) -- not configurable. */}
              <CodeInput
                value={code}
                onChange={setCode}
                onComplete={handleCodeComplete}
                disabled={submitting}
                length={8}
              />
              <div className={styles.resendRow}>
                <span>Didn&apos;t get it?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={styles.resendButton}
                  onClick={handleResend}
                  disabled={secondsLeft > 0}
                >
                  {secondsLeft > 0
                    ? `Resend in 0:${String(secondsLeft).padStart(2, '0')}`
                    : 'Resend code'}
                </Button>
              </div>
              <div className={styles.backRow}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ChevronLeftIcon size={14} />}
                  onClick={handleUseDifferentEmail}
                >
                  Use a different email
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
