import { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthCard } from './AuthCard';
import { AuthErrorBanner } from './AuthErrorBanner';

type FormErrors = {
  email?: string;
  form?: string;
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const RecoverForm = () => {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  const handleEmailChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (errors.email) {
      setErrors((current) => ({ ...current, email: undefined, form: undefined }));
    }
  }, [errors.email]);

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

      if (Object.keys(nextErrors).length > 0) {
        nextErrors.form = 'Sprawdz pole formularza.';
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      setSuccess(true);
    },
    [email],
  );

  return (
    <AuthCard
      title="Odzyskiwanie konta"
      description="Podaj email, aby otrzymac link do ustawienia nowego hasla."
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
            Jesli email istnieje, wyslemy link do resetu hasla.
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
        <Button type="submit" className="w-full">
          Wyslij link
        </Button>
      </form>
    </AuthCard>
  );
};
