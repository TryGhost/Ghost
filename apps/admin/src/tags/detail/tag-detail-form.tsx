import React from 'react';
import TagColorField from './tag-color-field';
import TagCodeInjectionAccordion from './tag-code-injection-accordion';
import TagImageField from './tag-image-field';
import {
  Card,
  CardContent,
  FieldError,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@tryghost/shade/components';
import { Grid, Inline, Stack } from '@tryghost/shade/primitives';
import {
  DESCRIPTION_MAX_LENGTH,
  FACEBOOK_DESCRIPTION_RECOMMENDED_LENGTH,
  FACEBOOK_TITLE_RECOMMENDED_LENGTH,
  META_DESCRIPTION_RECOMMENDED_LENGTH,
  META_TITLE_RECOMMENDED_LENGTH,
  X_DESCRIPTION_RECOMMENDED_LENGTH,
  X_TITLE_RECOMMENDED_LENGTH,
  charLength,
  getBlogDomain,
  getSeoDescription,
  getSeoTitle,
  getSeoUrl,
  getSlugUrlPreview,
  validateTagField,
} from './tag-detail-edit';
import { FacebookCardPreview, SeoPreview, XCardPreview } from './tag-detail-previews';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import type { TagEditableFields, TagFieldName } from './tag-detail-edit';

interface TagDetailFormProps {
  draft: TagEditableFields;
  errors: Partial<Record<TagFieldName, string>>;
  blogUrl: string;
  disabled?: boolean;
  onChange: (patch: Partial<TagEditableFields>) => void;
  onFieldError: (field: TagFieldName, message: string | null) => void;
  onImageBusyChange: (field: 'featureImage' | 'twitterImage' | 'ogImage', busy: boolean) => void;
  onImageUploadPendingChange: (
    field: 'featureImage' | 'twitterImage' | 'ogImage',
    pending: boolean,
  ) => void;
}

const errorId = (field: TagFieldName) => `tag-${field}-error`;
/** Ember's `gh-count-down-characters`: the used count, red once past the limit. */
const UsedCharacters: React.FC<{
  value: string;
  limit: number;
  prefix: 'Maximum' | 'Recommended';
}> = ({ value, limit, prefix }) => {
  const used = charLength(value);
  return (
    <p className="text-sm text-muted-foreground">
      {prefix}: {formatNumber(limit)} characters. You’ve used{' '}
      <span
        className={cn('font-semibold', used > limit ? 'text-destructive' : 'text-state-success')}
      >
        {formatNumber(used)}
      </span>
    </p>
  );
};

const TagDetailForm: React.FC<TagDetailFormProps> = ({
  draft,
  errors,
  blogUrl,
  disabled,
  onChange,
  onFieldError,
  onImageBusyChange,
  onImageUploadPendingChange,
}) => {
  const { data: settingsData } = useBrowseSettings({});
  const siteTitle = getSettingValue<string>(settingsData?.settings ?? [], 'title') ?? '';
  const siteMetaTitle = getSettingValue<string>(settingsData?.settings ?? [], 'meta_title') ?? '';
  const siteMetaDescription =
    getSettingValue<string>(settingsData?.settings ?? [], 'meta_description') ?? '';
  const unsplashEnabled =
    getSettingValue<boolean>(settingsData?.settings ?? [], 'unsplash') ?? false;

  const validateOnBlur = (field: TagFieldName) => {
    onFieldError(field, validateTagField(field, draft));
  };

  const seoTitle = getSeoTitle(draft, siteTitle);
  const seoDescription = getSeoDescription(draft);
  const seoUrl = getSeoUrl(draft, blogUrl);
  const socialSiteHeader = siteMetaTitle || siteTitle;
  const blogDomain = getBlogDomain(blogUrl);

  return (
    <Grid
      align="start"
      className="lg:grid-cols-2 sidebarlg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]"
      data-testid="tag-detail-form"
      gap="2xl"
    >
      {/* The main form and advanced settings collapse into one column
                below the medium breakpoint. */}
      <Stack gap="lg">
        <Card data-testid="tag-core-data-card">
          <CardContent className="p-6">
            <Stack gap="lg">
              <Stack gap="sm">
                <Inline align="start" gap="md">
                  <Stack className="min-w-0 flex-1" gap="sm">
                    <Label htmlFor="tag-name">Name</Label>
                    <Input
                      aria-describedby={errors.name ? errorId('name') : undefined}
                      aria-invalid={!!errors.name}
                      disabled={disabled}
                      id="tag-name"
                      value={draft.name}
                      onBlur={() => validateOnBlur('name')}
                      onChange={(e) => onChange({ name: e.target.value })}
                    />
                  </Stack>
                  <TagColorField
                    disabled={disabled}
                    errorId={errors.accentColor ? errorId('accentColor') : undefined}
                    value={draft.accentColor}
                    onChange={(accentColor) => onChange({ accentColor })}
                    onError={(message) => onFieldError('accentColor', message)}
                  />
                </Inline>
                <Stack gap="xs">
                  <FieldError className="text-sm" id={errorId('name')}>
                    {errors.name}
                  </FieldError>
                  <FieldError className="text-sm" id={errorId('accentColor')}>
                    {errors.accentColor}
                  </FieldError>
                  <p className="text-sm text-muted-foreground">
                    Start with # to create internal tags.{' '}
                    <a
                      className="underline"
                      href="https://ghost.org/help/organising-content/#private-tags"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Learn more
                    </a>
                  </p>
                </Stack>
              </Stack>

              <TagImageField
                disabled={disabled}
                id="tag-image"
                label="Tag image"
                unsplashEnabled={unsplashEnabled}
                uploadText="Upload tag image"
                value={draft.featureImage}
                onBusyChange={(busy) => onImageBusyChange('featureImage', busy)}
                onChange={(featureImage) => onChange({ featureImage })}
                onUploadPendingChange={(pending) =>
                  onImageUploadPendingChange('featureImage', pending)
                }
              />

              <Stack gap="sm">
                <Label htmlFor="tag-slug">Slug</Label>
                <Input
                  aria-describedby={errors.slug ? errorId('slug') : undefined}
                  aria-invalid={!!errors.slug}
                  disabled={disabled}
                  id="tag-slug"
                  value={draft.slug}
                  onBlur={() => validateOnBlur('slug')}
                  onChange={(e) => onChange({ slug: e.target.value })}
                />
                <p className="text-sm text-muted-foreground" data-testid="tag-slug-preview">
                  {getSlugUrlPreview(draft.slug, blogUrl)}
                </p>
                <FieldError className="text-sm" id={errorId('slug')}>
                  {errors.slug}
                </FieldError>
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="tag-description">Description</Label>
                <Textarea
                  aria-describedby={errors.description ? errorId('description') : undefined}
                  aria-invalid={!!errors.description}
                  className="min-h-24"
                  disabled={disabled}
                  id="tag-description"
                  value={draft.description}
                  onBlur={() => validateOnBlur('description')}
                  onChange={(e) => onChange({ description: e.target.value })}
                />
                <FieldError className="text-sm" id={errorId('description')}>
                  {errors.description}
                </FieldError>
                <UsedCharacters
                  limit={DESCRIPTION_MAX_LENGTH}
                  prefix="Maximum"
                  value={draft.description}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <TagCodeInjectionAccordion
          disabled={disabled}
          footerValue={draft.codeinjectionFoot}
          headerValue={draft.codeinjectionHead}
          onFooterChange={(codeinjectionFoot) => onChange({ codeinjectionFoot })}
          onHeaderChange={(codeinjectionHead) => onChange({ codeinjectionHead })}
        />
      </Stack>

      <Card className="overflow-hidden" data-testid="tag-metadata-card">
        <CardContent className="p-6">
          <Stack gap="lg">
            <Stack gap="none">
              <span className="text-[14px] font-semibold">Meta data</span>
              <span className="text-[13px] leading-[16px] font-normal tracking-normal text-muted-foreground">
                Extra content for search engines and social accounts.
              </span>
            </Stack>
            <Tabs defaultValue="search" variant="underline">
              <TabsList aria-label="Tag metadata">
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="x-card">X card</TabsTrigger>
                <TabsTrigger value="facebook-card">Facebook card</TabsTrigger>
              </TabsList>

              <TabsContent className="pt-5" value="search">
                <Stack gap="xl">
                  <Stack gap="lg">
                    <Stack gap="sm">
                      <Label htmlFor="meta-title">Meta title</Label>
                      <Input
                        aria-describedby={errors.metaTitle ? errorId('metaTitle') : undefined}
                        aria-invalid={!!errors.metaTitle}
                        disabled={disabled}
                        id="meta-title"
                        placeholder={draft.name}
                        value={draft.metaTitle}
                        onBlur={() => validateOnBlur('metaTitle')}
                        onChange={(e) => onChange({ metaTitle: e.target.value })}
                      />
                      <FieldError className="text-sm" id={errorId('metaTitle')}>
                        {errors.metaTitle}
                      </FieldError>
                      <UsedCharacters
                        limit={META_TITLE_RECOMMENDED_LENGTH}
                        prefix="Recommended"
                        value={draft.metaTitle}
                      />
                    </Stack>
                    <Stack gap="sm">
                      <Label htmlFor="meta-description">Meta description</Label>
                      <Textarea
                        aria-describedby={
                          errors.metaDescription ? errorId('metaDescription') : undefined
                        }
                        aria-invalid={!!errors.metaDescription}
                        disabled={disabled}
                        id="meta-description"
                        placeholder={draft.description}
                        value={draft.metaDescription}
                        onBlur={() => validateOnBlur('metaDescription')}
                        onChange={(e) => onChange({ metaDescription: e.target.value })}
                      />
                      <FieldError className="text-sm" id={errorId('metaDescription')}>
                        {errors.metaDescription}
                      </FieldError>
                      <UsedCharacters
                        limit={META_DESCRIPTION_RECOMMENDED_LENGTH}
                        prefix="Recommended"
                        value={draft.metaDescription}
                      />
                    </Stack>
                    <Stack gap="sm">
                      <Label htmlFor="canonical-url">Canonical URL</Label>
                      <Input
                        aria-describedby={errors.canonicalUrl ? errorId('canonicalUrl') : undefined}
                        aria-invalid={!!errors.canonicalUrl}
                        disabled={disabled}
                        id="canonical-url"
                        value={draft.canonicalUrl}
                        onBlur={() => validateOnBlur('canonicalUrl')}
                        onChange={(e) => onChange({ canonicalUrl: e.target.value })}
                      />
                      <FieldError className="text-sm" id={errorId('canonicalUrl')}>
                        {errors.canonicalUrl}
                      </FieldError>
                    </Stack>
                  </Stack>
                  <Stack
                    className="-mx-6 -mb-6 bg-preview-canvas px-6 pt-5 pb-[34px]"
                    data-testid="search-preview-surface"
                    gap="sm"
                  >
                    <Label>Search Engine Result Preview</Label>
                    <SeoPreview description={seoDescription} title={seoTitle} url={seoUrl} />
                  </Stack>
                </Stack>
              </TabsContent>

              <TabsContent className="pt-5" value="x-card">
                <Stack gap="xl">
                  <Stack gap="lg">
                    <TagImageField
                      disabled={disabled}
                      id="twitter-image"
                      label="X image"
                      unsplashEnabled={unsplashEnabled}
                      uploadText="Add X image"
                      value={draft.twitterImage}
                      onBusyChange={(busy) => onImageBusyChange('twitterImage', busy)}
                      onChange={(twitterImage) => onChange({ twitterImage })}
                      onUploadPendingChange={(pending) =>
                        onImageUploadPendingChange('twitterImage', pending)
                      }
                    />
                    <Stack gap="sm">
                      <Label htmlFor="twitter-title">X title</Label>
                      <Input
                        disabled={disabled}
                        id="twitter-title"
                        placeholder={draft.name}
                        value={draft.twitterTitle}
                        onChange={(e) => onChange({ twitterTitle: e.target.value })}
                      />
                      <UsedCharacters
                        limit={X_TITLE_RECOMMENDED_LENGTH}
                        prefix="Recommended"
                        value={draft.twitterTitle}
                      />
                    </Stack>
                    <Stack gap="sm">
                      <Label htmlFor="twitter-description">X description</Label>
                      <Textarea
                        disabled={disabled}
                        id="twitter-description"
                        placeholder={draft.description}
                        value={draft.twitterDescription}
                        onChange={(e) => onChange({ twitterDescription: e.target.value })}
                      />
                      <UsedCharacters
                        limit={X_DESCRIPTION_RECOMMENDED_LENGTH}
                        prefix="Recommended"
                        value={draft.twitterDescription}
                      />
                    </Stack>
                  </Stack>
                  <Stack
                    className="-mx-6 -mb-6 bg-preview-canvas px-6 pt-5 pb-[34px]"
                    data-testid="x-preview-surface"
                    gap="sm"
                  >
                    <Label>X preview</Label>
                    <XCardPreview
                      description={
                        draft.twitterDescription || seoDescription || siteMetaDescription || ''
                      }
                      domain={blogDomain}
                      image={draft.twitterImage || draft.featureImage}
                      siteHeader={socialSiteHeader}
                      title={draft.twitterTitle || seoTitle}
                    />
                  </Stack>
                </Stack>
              </TabsContent>

              <TabsContent className="pt-5" value="facebook-card">
                <Stack gap="xl">
                  <Stack gap="lg">
                    <TagImageField
                      disabled={disabled}
                      id="og-image"
                      label="Facebook image"
                      unsplashEnabled={unsplashEnabled}
                      uploadText="Add Facebook image"
                      value={draft.ogImage}
                      onBusyChange={(busy) => onImageBusyChange('ogImage', busy)}
                      onChange={(ogImage) => onChange({ ogImage })}
                      onUploadPendingChange={(pending) =>
                        onImageUploadPendingChange('ogImage', pending)
                      }
                    />
                    <Stack gap="sm">
                      <Label htmlFor="og-title">Facebook title</Label>
                      <Input
                        disabled={disabled}
                        id="og-title"
                        placeholder={draft.name}
                        value={draft.ogTitle}
                        onChange={(e) => onChange({ ogTitle: e.target.value })}
                      />
                      <UsedCharacters
                        limit={FACEBOOK_TITLE_RECOMMENDED_LENGTH}
                        prefix="Recommended"
                        value={draft.ogTitle}
                      />
                    </Stack>
                    <Stack gap="sm">
                      <Label htmlFor="og-description">Facebook description</Label>
                      <Textarea
                        disabled={disabled}
                        id="og-description"
                        placeholder={draft.description}
                        value={draft.ogDescription}
                        onChange={(e) => onChange({ ogDescription: e.target.value })}
                      />
                      <UsedCharacters
                        limit={FACEBOOK_DESCRIPTION_RECOMMENDED_LENGTH}
                        prefix="Recommended"
                        value={draft.ogDescription}
                      />
                    </Stack>
                  </Stack>
                  <Stack
                    className="-mx-6 -mb-6 bg-preview-canvas px-6 pt-5 pb-[34px]"
                    data-testid="facebook-preview-surface"
                    gap="sm"
                  >
                    <Label>Facebook preview</Label>
                    {/* The description chain deliberately skips ogDescription: Ember read a
                                        nonexistent `facebookDescription` attribute, so ogDescription never
                                        fed this preview (`tag-form.js` `facebookDescription`). */}
                    <FacebookCardPreview
                      description={seoDescription || siteMetaDescription || ''}
                      domain={blogDomain}
                      image={draft.ogImage || draft.featureImage}
                      siteHeader={socialSiteHeader}
                      title={draft.ogTitle || seoTitle}
                    />
                  </Stack>
                </Stack>
              </TabsContent>
            </Tabs>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default TagDetailForm;
