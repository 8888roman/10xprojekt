type AuthErrorBannerProps = {
  message: string;
};

export const AuthErrorBanner = ({ message }: AuthErrorBannerProps) => (
  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
    {message}
  </div>
);
