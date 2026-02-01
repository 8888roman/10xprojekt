import { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthCard } from './AuthCard';
import { AuthErrorBanner } from './AuthErrorBanner';

type FormErrors = {
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const RegisterForm = () => {
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  const handleEmailChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (errors.email) {
      setErrors((current) => ({ ...current, email: undefined, form: undefined }));
    }
  }, [errors.email]);

  const handlePasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (errors.password) {
      setErrors((current) => ({ ...current, password: undefined, form: undefined }));
    }
  }, [errors.password]);

  const handleConfirmChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirm(event.target.value);
    if (errors.confirm) {
      setErrors((current) => ({ ...current, confirm: undefined, form: undefined }));
    }
  }, [errors.confirm]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSuccess(false);

      const nextErrors: FormErrors = {};
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        nextErrors.email = 'Email jest wymagany.';
      } else if (!isValidEmail(trimmedEmail)) {
        nextErrors.email = 'Podaj poprawny adres email.';
      }

      if (!password) {
        nextErrors.password = 'Haslo jest wymagane.';
      } else if (password.length < 8) {
        nextErrors.password = 'Haslo musi miec co najmniej 8 znakow.';
      }

      if (!confirm) {
        nextErrors.confirm = 'Powtorz haslo.';
      } else if (password && confirm !== password) {
        nextErrors.confirm = 'Hasla musza byc takie same.';
      }

      if (Object.keys(nextErrors).length > 0) {
        nextErrors.form = 'Sprawdz pola formularza.';
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      setSuccess(true);
    },
    [confirm, email, password],
  );

  return (
    <AuthCard
      title="Rejestracja"
      description="Utworz konto, aby zapisywac fiszki i historie generowania."
      footer={
        <div className="text-center">
          Masz juz konto? <a className="font-medium text-foreground underline" href="/login">Zaloguj sie</a>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {errors.form && <AuthErrorBanner message={errors.form} />}
        {success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Dane wygladaja poprawnie. Po podlaczeniu backendu konto zostanie utworzone.
          </div>
        )}
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
            placeholder="Minimum 8 znakow"
          />
          {errors.password && (
            <p id={`${passwordId}-error`} className="text-xs text-destructive">
              {errors.password}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={confirmId}>
            Powtorz haslo
          </label>
          <input
            id={confirmId}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="password"
            value={confirm}
            onChange={handleConfirmChange}
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? `${confirmId}-error` : undefined}
            placeholder="Powtorz haslo"
          />
          {errors.confirm && (
            <p id={`${confirmId}-error`} className="text-xs text-destructive">
              {errors.confirm}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full">
          Zarejestruj sie
        </Button>
      </form>
    </AuthCard>
  );
};
