import { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthCard } from './AuthCard';
import { AuthErrorBanner } from './AuthErrorBanner';

type FormErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const LoginForm = () => {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (errors.email || errors.form) {
      setErrors((current) => ({ ...current, email: undefined, form: undefined }));
    }
  }, [errors.email, errors.form]);

  const handlePasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (errors.password || errors.form) {
      setErrors((current) => ({ ...current, password: undefined, form: undefined }));
    }
  }, [errors.password, errors.form]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextErrors: FormErrors = {};
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        nextErrors.email = 'Email jest wymagany.';
      } else if (!isValidEmail(trimmedEmail)) {
        nextErrors.email = 'Podaj poprawny adres email.';
      }

      if (!password) {
        nextErrors.password = 'Haslo jest wymagane.';
      }

      if (Object.keys(nextErrors).length > 0) {
        nextErrors.form = 'Sprawdz pola formularza.';
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });

        if (!response.ok) {
          setErrors({ form: 'Nieprawidlowy email lub haslo.' });
          return;
        }

        window.location.href = '/generate';
      } catch {
        setErrors({ form: 'Wystapil blad serwera. Sprobuj ponownie.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password],
  );

  return (
    <AuthCard
      title="Logowanie"
      description="Zaloguj sie, aby uzyskac dostep do swoich fiszek."
      footer={
        <div className="flex flex-col gap-2 text-center">
          <span>
            Nie masz konta? <a className="font-medium text-foreground underline" href="/register">Zarejestruj sie</a>
          </span>
          <a className="underline" href="/recover">
            Nie pamietasz hasla?
          </a>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {errors.form && <AuthErrorBanner message={errors.form} />}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="email"
            value={email}
            onChange={handleEmailChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            placeholder="name@example.com"
          />
          {errors.email && (
            <p id={`${emailId}-error`} className="text-xs text-destructive">
              {errors.email}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={passwordId}>
            Haslo
          </label>
          <input
            id={passwordId}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            placeholder="Wpisz haslo"
          />
          {errors.password && (
            <p id={`${passwordId}-error`} className="text-xs text-destructive">
              {errors.password}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Logowanie...' : 'Zaloguj sie'}
        </Button>
      </form>
    </AuthCard>
  );
};
