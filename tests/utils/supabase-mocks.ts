type AuthOverrides = Partial<{
  getUser: () => Promise<unknown>;
  setSession: () => Promise<unknown>;
  setAuth: () => Promise<unknown> | undefined;
}>;

export const createCookies = (values: Record<string, string>) => ({
  get: (key: string) => (key in values ? { value: values[key] } : undefined),
});

export const createRequestWithAuth = (url: string) =>
  new Request(url, {
    headers: { Authorization: "Bearer token" },
  });

export const createAuthSupabaseMock = (overrides: AuthOverrides = {}) => ({
  auth: {
    getUser: async () => ({ data: { user: { id: "user-id" } }, error: null }),
    setSession: async () => ({ data: null, error: null }),
    setAuth: async () => undefined,
    ...overrides,
  },
});
