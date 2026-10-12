const PACKAGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidPackageName(name: string) {
  return PACKAGE_NAME_PATTERN.test(name);
}

export function applyPackageTemplateTokens(
  text: string,
  { name, directory, description }: { name: string; directory: string; description: string },
) {
  return text
    .replaceAll('{{NAME}}', name)
    .replaceAll('{{DIRECTORY}}', directory)
    .replaceAll('{{DESCRIPTION}}', description);
}
