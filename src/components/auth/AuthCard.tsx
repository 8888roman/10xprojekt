import type { ReactNode } from 'react';

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export const AuthCard = ({ title, description, children, footer }: AuthCardProps) => (
  <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
    <header className="space-y-2 text-center">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </header>
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">{footer}</div>}
    </section>
  </main>
);
