// Flat snake_case <-> camelCase key mappers. Top-level keys only: values are copied by reference
// and their types pass through untouched (T[K]). Deep case-convert libraries recurse into value
// types, which mangles branded primitives (a branded string is `string & {...}`, so it reads as an
// object and gets walked); staying flat sidesteps that and keeps the keys' value types exact.

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
    : S;

type CamelToSnake<S extends string> = S extends `${infer Head}${infer Tail}`
    ? Head extends Uppercase<Head>
        ? Head extends Lowercase<Head>
            ? `${Head}${CamelToSnake<Tail>}` // non-letter (digit, etc.): leave as-is
            : `_${Lowercase<Head>}${CamelToSnake<Tail>}` // uppercase letter: split with an underscore
        : `${Head}${CamelToSnake<Tail>}` // lowercase letter: keep
    : S;

export type CamelKeys<T> = {[K in keyof T as SnakeToCamel<K & string>]: T[K]};
export type SnakeKeys<T> = {[K in keyof T as CamelToSnake<K & string>]: T[K]};

const toCamel = (key: string): string => key.replace(/_([a-z])/g, (_full, letter: string) => letter.toUpperCase());
const toSnake = (key: string): string => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export function camelKeys<T extends object>(row: T): CamelKeys<T> {
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value])) as CamelKeys<T>;
}

export function snakeKeys<T extends object>(model: T): SnakeKeys<T> {
    return Object.fromEntries(Object.entries(model).map(([key, value]) => [toSnake(key), value])) as SnakeKeys<T>;
}
