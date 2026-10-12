import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { applyPackageTemplateTokens, isValidPackageName } from './package-template.ts';
import { withPrivatePackageIgnored } from './versioning-ignore.ts';

interface PackageOptions {
  name: string;
  directory?: string;
  description?: string;
}

function isInside(root: string, target: string): boolean {
  const path = relative(root, target);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`);
}

async function existingAncestor(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    return existingAncestor(dirname(path));
  }
}

export async function generatePackage(root: string, options: PackageOptions): Promise<string> {
  const { name, description = `The ${options.name} package for Ghost.` } = options;
  if (!isValidPackageName(name)) {
    throw new Error(`Invalid package name "${name}". Use lowercase kebab-case without an @scope.`);
  }
  root = await realpath(root);
  const target = resolve(root, options.directory ?? `packages/${name}`);
  const ancestor = await existingAncestor(dirname(target));
  if (!isInside(root, target) || (ancestor !== root && !isInside(root, ancestor))) {
    throw new Error('--dir must resolve to a location inside the repository.');
  }
  const directory = relative(root, target).split(sep).join('/');
  const manifest = join(root, 'pnpm-workspace.yaml');
  const originalManifest = await readFile(manifest, 'utf8');
  const updatedManifest = withPrivatePackageIgnored(originalManifest, `@tryghost/${name}`);
  const manifestMode = (await stat(manifest)).mode;
  const staging = await mkdtemp(join(root, '.gx-package-'));
  const stagedPackage = join(staging, 'package');
  let created = false;
  try {
    const template = join(root, 'packages/_template');
    await cp(template, stagedPackage, {
      recursive: true,
      filter: (source) =>
        !/(^|[/\\])(node_modules|build|dist|coverage|\.eslintcache)([/\\]|$)|\.tsbuildinfo$/.test(
          relative(template, source),
        ),
    });
    const tokens = (text: string) =>
      applyPackageTemplateTokens(text, { name, directory, description });
    // Replace JSON values after parsing, so quotes and newlines in descriptions stay valid JSON.
    const jsonTokens = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return tokens(value);
      }
      if (Array.isArray(value)) {
        return value.map(jsonTokens);
      }
      if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [key, jsonTokens(entry)]),
        );
      }
      return value;
    };
    const render = async (path: string): Promise<void> => {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const file = join(path, entry.name);
        if (entry.isDirectory()) {
          await render(file);
        } else {
          const text = await readFile(file, 'utf8');
          await writeFile(
            file,
            entry.name === 'package.json'
              ? `${JSON.stringify(jsonTokens(JSON.parse(text)), null, 2)}\n`
              : tokens(text),
          );
        }
      }
    };
    await render(stagedPackage);
    const stagedManifest = join(staging, 'pnpm-workspace.yaml');
    await writeFile(stagedManifest, updatedManifest, { mode: manifestMode });
    await mkdir(dirname(target), { recursive: true });
    try {
      // Reserve the destination exclusively; never overwrite an existing package.
      await mkdir(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error(`${directory} already exists.`);
      }
      throw error;
    }
    created = true;
    for (const entry of await readdir(stagedPackage)) {
      await cp(join(stagedPackage, entry), join(target, entry), {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
    }
    if ((await readFile(manifest, 'utf8')) !== originalManifest) {
      throw new Error('pnpm-workspace.yaml changed during generation. Retry the command.');
    }
    await rename(stagedManifest, manifest);
    return directory;
  } catch (error) {
    if (created) {
      await rm(target, { recursive: true, force: true });
    }
    throw error;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
