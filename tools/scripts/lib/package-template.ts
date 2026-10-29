const PACKAGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface PackageTemplateTokens {
  name: string;
  directory: string;
  description: string;
}

export function isValidPackageName(name: string): boolean {
  return PACKAGE_NAME_PATTERN.test(name);
}

export function applyPackageTemplateTokens(
  text: string,
  { name, directory, description }: PackageTemplateTokens,
): string {
  return text
    .replaceAll('{{NAME}}', name)
    .replaceAll('{{DIRECTORY}}', directory)
    .replaceAll('{{DESCRIPTION}}', description);
}
