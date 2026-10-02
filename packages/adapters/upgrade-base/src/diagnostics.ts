import { z } from 'zod';

const code = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/);

const relativeFile = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('\\') &&
      !/^[a-z]:/i.test(value) &&
      !value.split('/').some((part) => part === '..' || part === '.'),
    'Diagnostic files must be relative paths without traversal.',
  );

/** Deliberately public, plain-text diagnostics, rather than serialized exceptions. */
export const upgradeDiagnosticSchema = z.object({
  source: code,
  code,
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string().min(1).max(2048),
  details: z.string().max(8192).optional(),
  help: z.url({ protocol: /^https$/ }).optional(),
  locations: z
    .array(
      z.object({
        file: relativeFile,
        line: z.int().positive().optional(),
        column: z.int().positive().optional(),
      }),
    )
    .max(100)
    .optional(),
});

export const upgradeDiagnosticsSchema = z.array(upgradeDiagnosticSchema).max(200);

export type UpgradeDiagnostic = z.infer<typeof upgradeDiagnosticSchema>;
