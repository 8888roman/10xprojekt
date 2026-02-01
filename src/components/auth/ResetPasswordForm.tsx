import { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthCard } from './AuthCard';
import { AuthErrorBanner } from './AuthErrorBanner';

type FormErrors = {
  password?: string;
  confirm?: string;
  form?: string;
};

export const ResetPasswordForm = () => {
  const passwordId = useId();
  const confirmId = useId();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

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
    [confirm, password],
  );

  return (
    <AuthCard
      title="Ustaw nowe haslo"
      description="Wpisz nowe haslo dla swojego konta."
      footer={
        <div className="text-center">
          Wroc do <a className="font-medium text-foreground underline" href="/login">logowania</a>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {errors.form && <AuthErrorBanner message={errors.form} />}
        {success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Haslo wyglada poprawnie. Po podlaczeniu backendu nastapi zmiana hasla.
          </div>
        )}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={passwordId}>
            Nowe haslo
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
          Zmien haslo
        </Button>
      </form>
    </AuthCard>
  );
};
