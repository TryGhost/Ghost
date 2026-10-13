const PACKAGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidPackageName(name) {
  return PACKAGE_NAME_PATTERN.test(name);
}

export function applyPackageTemplateTokens(text, { name, directory, description }) {
  return text
    .replaceAll('{{NAME}}', name)
    .replaceAll('{{DIRECTORY}}', directory)
    .replaceAll('{{DESCRIPTION}}', description);
}
