interface ContentFile {
  name: string;
}

interface ContentFileClaim<File extends ContentFile> {
  type: string;
  files: File[];
}

/**
 * Pick the content handler that imports a zip entry. Handlers claim files by
 * extension, and the extension lists overlap (images and media are also
 * allowed as files), so a file under a folder named after a handler's type,
 * such as content/images/, goes to that handler. Any other file goes to the
 * first handler that claims it. Theme files are not site content.
 */
export function getContentFileOwner(
  name: string,
  baseDir: string | undefined,
  claimants: string[],
): string | undefined {
  let segments = name.split('/');
  if (baseDir && segments[0] === baseDir) {
    segments = segments.slice(1);
  }
  if (segments[0] === 'content' && segments.length > 1) {
    if (segments[1] === 'themes') {
      return undefined;
    }
    segments = segments.slice(1);
  }

  const directory = segments.length > 1 ? segments[0] : undefined;
  if (directory && claimants.includes(directory)) {
    return directory;
  }

  return claimants[0];
}

/**
 * Leave each claimed file with only the handler that owns it. Claims are in
 * handler order.
 */
export function routeContentFiles<File extends ContentFile>(
  claims: ContentFileClaim<File>[],
  baseDir: string | undefined,
): ContentFileClaim<File>[] {
  const claimants = new Map<string, string[]>();
  for (const { type, files } of claims) {
    for (const file of files) {
      const types = claimants.get(file.name) ?? [];
      types.push(type);
      claimants.set(file.name, types);
    }
  }

  return claims.map(({ type, files }) => ({
    type,
    files: files.filter(
      (file) => getContentFileOwner(file.name, baseDir, claimants.get(file.name) ?? []) === type,
    ),
  }));
}
