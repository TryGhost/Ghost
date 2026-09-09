import type { Theme, ThemeTemplate } from '@tryghost/admin-x-framework/api/themes';
import type { PostType } from '@/editor/card-config';

/** The select's stand-in for no custom template; every theme filename is prefixed. */
export const DEFAULT_TEMPLATE_VALUE = 'default';

export const DEFAULT_TEMPLATE_LABEL = 'Default';

/** Only the active theme reports its templates, so it is the only one to read. */
export function activeThemeTemplates(themes: Theme[] | undefined): ThemeTemplate[] {
  return themes?.find((theme) => theme.active)?.templates ?? [];
}

function appliesTo(template: ThemeTemplate, postType: PostType): boolean {
  return !template.for || template.for.includes(postType);
}

/** The templates a writer may pick: those bound to no slug, by name. */
export function templateOptions(templates: ThemeTemplate[]): ThemeTemplate[] {
  return templates
    .filter((template) => !template.slug)
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** The template the post's own URL already selects, whatever the field holds. */
export function slugTemplate(
  templates: ThemeTemplate[],
  postType: PostType,
  slug: string | null | undefined,
): ThemeTemplate | undefined {
  return slug
    ? templates.find(
        (template) => !!template.slug && appliesTo(template, postType) && template.slug === slug,
      )
    : undefined;
}

/** The option the select shows; a template the theme no longer offers falls back to the default. */
export function selectedTemplate(options: ThemeTemplate[], customTemplate: string | null): string {
  return options.some((option) => option.filename === customTemplate) && customTemplate
    ? customTemplate
    : DEFAULT_TEMPLATE_VALUE;
}
