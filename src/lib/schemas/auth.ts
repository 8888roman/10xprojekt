import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Podaj poprawny adres email.' }),
  password: z.string().min(8, { message: 'Haslo musi miec co najmniej 8 znakow.' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email({ message: 'Podaj poprawny adres email.' }),
  password: z.string().min(8, { message: 'Haslo musi miec co najmniej 8 znakow.' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
