import { z } from 'zod';

const options = z.object({
  'base-data-pack': z.string().default(''),
  'clear-database': z.boolean().default(false),
  tables: z.string().default(''),
  quantities: z.string().default(''),
  'with-default': z.boolean().default(false),
  'print-dependencies': z.boolean().default(false),
  seed: z.union([z.number(), z.string()]).optional(),
});

const quantity = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative());

const tableEntry = z.tuple([z.string().min(1), quantity.optional()]);
const quantityEntry = z.tuple([z.string().min(1), quantity]);

/** Validate parsed CLI values and normalize them for Core's data generator. */
export function parseDataGeneratorOptions(value: unknown) {
  const argv = options.parse(value);
  const tables = argv.tables
    .split(',')
    .filter(Boolean)
    .map((entry) => {
      const [name, amount] = tableEntry.parse(entry.split(':'));
      return { name, quantity: amount };
    });
  const quantities: Record<string, number> = {};
  for (const entry of argv.quantities.split(',').filter(Boolean)) {
    const [name, amount] = quantityEntry.parse(entry.split(':'), {
      error: () => `Invalid quantity override: ${entry}`,
    });
    quantities[name] = amount;
  }

  return {
    baseDataPack: argv['base-data-pack'],
    clearDatabase: argv['clear-database'],
    tables,
    quantities,
    withDefault: argv['with-default'],
    printDependencies: argv['print-dependencies'],
    seed:
      argv.seed === undefined || argv.seed === '' ? undefined : z.coerce.number().parse(argv.seed),
  };
}
