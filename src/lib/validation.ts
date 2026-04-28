import { z } from "zod";

export const emailSchema = z.string().trim().email().max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = registerSchema;

export const taskExtractionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  category: z.enum(["work", "personal", "study", "health", "finance", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  status: z.literal("todo"),
  dueDate: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
    .transform((value) => {
      if (!value) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return `${value}T00:00:00.000Z`;
      }
      return value;
    }),
});

export type TaskExtractionResult = z.infer<typeof taskExtractionSchema>;
