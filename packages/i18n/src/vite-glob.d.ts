// Vite's import.meta.glob, used by the bundler-resolved registry entries.
interface ImportMeta {
  glob<T = unknown>(
    pattern: string,
    options: { eager: true; import: 'default' },
  ): Record<string, T>;
}
