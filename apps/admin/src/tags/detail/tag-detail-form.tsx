import React from 'react';
import TagColorField from './tag-color-field';
import TagImageField from './tag-image-field';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger, Card, CardContent, CodeEditor, FieldError, Input, Label, Textarea} from '@tryghost/shade/components';
import {Grid, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {DESCRIPTION_MAX_LENGTH, FACEBOOK_DESCRIPTION_RECOMMENDED_LENGTH, FACEBOOK_TITLE_RECOMMENDED_LENGTH, META_DESCRIPTION_RECOMMENDED_LENGTH, META_TITLE_RECOMMENDED_LENGTH, X_DESCRIPTION_RECOMMENDED_LENGTH, X_TITLE_RECOMMENDED_LENGTH, charLength, getBlogDomain, getSeoDescription, getSeoTitle, getSeoUrl, getSlugUrlPreview, validateTagField} from './tag-detail-edit';
import {FacebookCardPreview, SeoPreview, XCardPreview} from './tag-detail-previews';
import {cn, formatNumber} from '@tryghost/shade/utils';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {TagEditableFields, TagFieldName} from './tag-detail-edit';

interface TagDetailFormProps {
    draft: TagEditableFields;
    errors: Partial<Record<TagFieldName, string>>;
    blogUrl: string;
    disabled?: boolean;
    onChange: (patch: Partial<TagEditableFields>) => void;
    onFieldError: (field: TagFieldName, message: string | null) => void;
    onImageBusyChange: (field: 'featureImage' | 'twitterImage' | 'ogImage', busy: boolean) => void;
    onImageUploadPendingChange: (field: 'featureImage' | 'twitterImage' | 'ogImage', pending: boolean) => void;
}

const errorId = (field: TagFieldName) => `tag-${field}-error`;
const htmlExtensions = [() => import('@codemirror/lang-html').then(module => module.html())];

/** Ember's `gh-count-down-characters`: the used count, red once past the limit. */
const UsedCharacters: React.FC<{value: string; limit: number; prefix: 'Maximum' | 'Recommended'}> = ({value, limit, prefix}) => {
    const used = charLength(value);
    return (
        <p className='text-sm text-muted-foreground'>
            {prefix}: <span className='font-semibold text-foreground'>{formatNumber(limit)}</span> characters. You’ve used{' '}
            <span className={cn('font-semibold', used > limit ? 'text-destructive' : 'text-state-success')}>{formatNumber(used)}</span>
        </p>
    );
};

const SectionTrigger: React.FC<{title: string; description: string}> = ({title, description}) => (
    <AccordionTrigger className='px-6 hover:no-underline'>
        <Stack className='text-left' gap='none'>
            <Text as='span' leading='tight' size='md' weight='semibold'>{title}</Text>
            <Text as='span' className='text-base' leading='tight' tone='secondary'>{description}</Text>
        </Stack>
    </AccordionTrigger>
);

const TagDetailForm: React.FC<TagDetailFormProps> = ({draft, errors, blogUrl, disabled, onChange, onFieldError, onImageBusyChange, onImageUploadPendingChange}) => {
    const {data: settingsData} = useBrowseSettings({});
    const siteTitle = getSettingValue<string>(settingsData?.settings ?? [], 'title') ?? '';
    const siteMetaTitle = getSettingValue<string>(settingsData?.settings ?? [], 'meta_title') ?? '';
    const siteMetaDescription = getSettingValue<string>(settingsData?.settings ?? [], 'meta_description') ?? '';
    const unsplashEnabled = getSettingValue<boolean>(settingsData?.settings ?? [], 'unsplash') ?? false;

    const validateOnBlur = (field: TagFieldName) => {
        onFieldError(field, validateTagField(field, draft));
    };

    const seoTitle = getSeoTitle(draft, siteTitle);
    const seoDescription = getSeoDescription(draft);
    const seoUrl = getSeoUrl(draft, blogUrl);
    const socialSiteHeader = siteMetaTitle || siteTitle;
    const blogDomain = getBlogDomain(blogUrl);

    return (
        <Grid align='start' className='lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' data-testid='tag-detail-form' gap='2xl'>
            {/* The main form and advanced settings collapse into one column
                below the large breakpoint. */}
            <Card data-testid='tag-core-data-card'>
                <CardContent className='p-6'>
                    <Stack gap='lg'>
                        <Stack gap='sm'>
                            <Inline align='start' gap='md'>
                                <Stack className='min-w-0 flex-1' gap='sm'>
                                    <Label htmlFor='tag-name'>Name</Label>
                                    <Input
                                        aria-describedby={errors.name ? errorId('name') : undefined}
                                        aria-invalid={!!errors.name}
                                        disabled={disabled}
                                        id='tag-name'
                                        value={draft.name}
                                        onBlur={() => validateOnBlur('name')}
                                        onChange={e => onChange({name: e.target.value})}
                                    />
                                </Stack>
                                <TagColorField
                                    disabled={disabled}
                                    errorId={errors.accentColor ? errorId('accentColor') : undefined}
                                    value={draft.accentColor}
                                    onChange={accentColor => onChange({accentColor})}
                                    onError={message => onFieldError('accentColor', message)}
                                />
                            </Inline>
                            <Stack gap='xs'>
                                <FieldError className='text-sm' id={errorId('name')}>{errors.name}</FieldError>
                                <FieldError className='text-sm' id={errorId('accentColor')}>{errors.accentColor}</FieldError>
                                <p className='text-sm text-muted-foreground'>
                                    Start with # to create internal tags.{' '}
                                    <a className='underline' href='https://ghost.org/help/organising-content/#private-tags' rel='noopener noreferrer' target='_blank'>Learn more</a>
                                </p>
                            </Stack>
                        </Stack>

                        <TagImageField
                            disabled={disabled}
                            id='tag-image'
                            label='Tag image'
                            unsplashEnabled={unsplashEnabled}
                            uploadText='Upload tag image'
                            value={draft.featureImage}
                            onBusyChange={busy => onImageBusyChange('featureImage', busy)}
                            onChange={featureImage => onChange({featureImage})}
                            onUploadPendingChange={pending => onImageUploadPendingChange('featureImage', pending)}
                        />

                        <Stack gap='sm'>
                            <Label htmlFor='tag-slug'>Slug</Label>
                            <Input
                                aria-describedby={errors.slug ? errorId('slug') : undefined}
                                aria-invalid={!!errors.slug}
                                disabled={disabled}
                                id='tag-slug'
                                value={draft.slug}
                                onBlur={() => validateOnBlur('slug')}
                                onChange={e => onChange({slug: e.target.value})}
                            />
                            <p className='text-sm text-muted-foreground' data-testid='tag-slug-preview'>{getSlugUrlPreview(draft.slug, blogUrl)}</p>
                            <FieldError className='text-sm' id={errorId('slug')}>{errors.slug}</FieldError>
                        </Stack>

                        <Stack gap='sm'>
                            <Label htmlFor='tag-description'>Description</Label>
                            <Textarea
                                aria-describedby={errors.description ? errorId('description') : undefined}
                                aria-invalid={!!errors.description}
                                className='min-h-24'
                                disabled={disabled}
                                id='tag-description'
                                value={draft.description}
                                onBlur={() => validateOnBlur('description')}
                                onChange={e => onChange({description: e.target.value})}
                            />
                            <FieldError className='text-sm' id={errorId('description')}>{errors.description}</FieldError>
                            <UsedCharacters limit={DESCRIPTION_MAX_LENGTH} prefix='Maximum' value={draft.description} />
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            <Card>
                <CardContent className='px-0 py-2'>
                    <Accordion defaultValue='metadata' type='single' collapsible>
                        <AccordionItem className='last:border-b-0' value='metadata'>
                            <SectionTrigger description='Extra content for search engines.' title='Meta data' />
                            <AccordionContent className='bg-surface-elevated px-6'>
                                <Stack className='pt-2' gap='xl'>
                                    <Stack gap='lg'>
                                        <Stack gap='sm'>
                                            <Label htmlFor='meta-title'>Meta title</Label>
                                            <Input
                                                aria-describedby={errors.metaTitle ? errorId('metaTitle') : undefined}
                                                aria-invalid={!!errors.metaTitle}
                                                disabled={disabled}
                                                id='meta-title'
                                                placeholder={draft.name}
                                                value={draft.metaTitle}
                                                onBlur={() => validateOnBlur('metaTitle')}
                                                onChange={e => onChange({metaTitle: e.target.value})}
                                            />
                                            <FieldError className='text-sm' id={errorId('metaTitle')}>{errors.metaTitle}</FieldError>
                                            <UsedCharacters limit={META_TITLE_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.metaTitle} />
                                        </Stack>
                                        <Stack gap='sm'>
                                            <Label htmlFor='meta-description'>Meta description</Label>
                                            <Textarea
                                                aria-describedby={errors.metaDescription ? errorId('metaDescription') : undefined}
                                                aria-invalid={!!errors.metaDescription}
                                                disabled={disabled}
                                                id='meta-description'
                                                placeholder={draft.description}
                                                value={draft.metaDescription}
                                                onBlur={() => validateOnBlur('metaDescription')}
                                                onChange={e => onChange({metaDescription: e.target.value})}
                                            />
                                            <FieldError className='text-sm' id={errorId('metaDescription')}>{errors.metaDescription}</FieldError>
                                            <UsedCharacters limit={META_DESCRIPTION_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.metaDescription} />
                                        </Stack>
                                        <Stack gap='sm'>
                                            <Label htmlFor='canonical-url'>Canonical URL</Label>
                                            <Input
                                                aria-describedby={errors.canonicalUrl ? errorId('canonicalUrl') : undefined}
                                                aria-invalid={!!errors.canonicalUrl}
                                                disabled={disabled}
                                                id='canonical-url'
                                                value={draft.canonicalUrl}
                                                onBlur={() => validateOnBlur('canonicalUrl')}
                                                onChange={e => onChange({canonicalUrl: e.target.value})}
                                            />
                                            <FieldError className='text-sm' id={errorId('canonicalUrl')}>{errors.canonicalUrl}</FieldError>
                                        </Stack>
                                    </Stack>
                                    <Stack gap='sm'>
                                        <Label>Search Engine Result Preview</Label>
                                        <SeoPreview description={seoDescription} title={seoTitle} url={seoUrl} />
                                    </Stack>
                                </Stack>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem className='last:border-b-0' value='x-card'>
                            <SectionTrigger description='Customized structured data for X.' title='X card' />
                            <AccordionContent className='bg-surface-elevated px-6'>
                                <Stack className='pt-2' gap='xl'>
                                    <Stack gap='lg'>
                                        <TagImageField
                                            disabled={disabled}
                                            id='twitter-image'
                                            label='X image'
                                            unsplashEnabled={unsplashEnabled}
                                            uploadText='Add X image'
                                            value={draft.twitterImage}
                                            onBusyChange={busy => onImageBusyChange('twitterImage', busy)}
                                            onChange={twitterImage => onChange({twitterImage})}
                                            onUploadPendingChange={pending => onImageUploadPendingChange('twitterImage', pending)}
                                        />
                                        <Stack gap='sm'>
                                            <Label htmlFor='twitter-title'>X title</Label>
                                            <Input
                                                disabled={disabled}
                                                id='twitter-title'
                                                placeholder={draft.name}
                                                value={draft.twitterTitle}
                                                onChange={e => onChange({twitterTitle: e.target.value})}
                                            />
                                            <UsedCharacters limit={X_TITLE_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.twitterTitle} />
                                        </Stack>
                                        <Stack gap='sm'>
                                            <Label htmlFor='twitter-description'>X description</Label>
                                            <Textarea
                                                disabled={disabled}
                                                id='twitter-description'
                                                placeholder={draft.description}
                                                value={draft.twitterDescription}
                                                onChange={e => onChange({twitterDescription: e.target.value})}
                                            />
                                            <UsedCharacters limit={X_DESCRIPTION_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.twitterDescription} />
                                        </Stack>
                                    </Stack>
                                    <Stack gap='sm'>
                                        <Label>X preview</Label>
                                        <XCardPreview
                                            description={draft.twitterDescription || seoDescription || siteMetaDescription || ''}
                                            domain={blogDomain}
                                            image={draft.twitterImage || draft.featureImage}
                                            siteHeader={socialSiteHeader}
                                            title={draft.twitterTitle || seoTitle}
                                        />
                                    </Stack>
                                </Stack>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem className='last:border-b-0' value='facebook-card'>
                            <SectionTrigger description='Customize Open Graph data.' title='Facebook card' />
                            <AccordionContent className='bg-surface-elevated px-6'>
                                <Stack className='pt-2' gap='xl'>
                                    <Stack gap='lg'>
                                        <TagImageField
                                            disabled={disabled}
                                            id='og-image'
                                            label='Facebook image'
                                            unsplashEnabled={unsplashEnabled}
                                            uploadText='Add Facebook image'
                                            value={draft.ogImage}
                                            onBusyChange={busy => onImageBusyChange('ogImage', busy)}
                                            onChange={ogImage => onChange({ogImage})}
                                            onUploadPendingChange={pending => onImageUploadPendingChange('ogImage', pending)}
                                        />
                                        <Stack gap='sm'>
                                            <Label htmlFor='og-title'>Facebook title</Label>
                                            <Input
                                                disabled={disabled}
                                                id='og-title'
                                                placeholder={draft.name}
                                                value={draft.ogTitle}
                                                onChange={e => onChange({ogTitle: e.target.value})}
                                            />
                                            <UsedCharacters limit={FACEBOOK_TITLE_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.ogTitle} />
                                        </Stack>
                                        <Stack gap='sm'>
                                            <Label htmlFor='og-description'>Facebook description</Label>
                                            <Textarea
                                                disabled={disabled}
                                                id='og-description'
                                                placeholder={draft.description}
                                                value={draft.ogDescription}
                                                onChange={e => onChange({ogDescription: e.target.value})}
                                            />
                                            <UsedCharacters limit={FACEBOOK_DESCRIPTION_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.ogDescription} />
                                        </Stack>
                                    </Stack>
                                    <Stack gap='sm'>
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
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem className='last:border-b-0' value='code-injection'>
                            <SectionTrigger description='Add styles/scripts to the header and footer.' title='Code injection' />
                            <AccordionContent className='bg-surface-elevated px-6'>
                                <Stack className='pt-2' gap='lg'>
                                    <CodeEditor
                                        data-testid='codeinjection-head'
                                        editable={!disabled}
                                        extensions={htmlExtensions}
                                        height='128px'
                                        title={<>Tag header <code className='ml-1 font-normal'>{'{{ghost_head}}'}</code></>}
                                        value={draft.codeinjectionHead}
                                        onChange={value => onChange({codeinjectionHead: value})}
                                    />
                                    <CodeEditor
                                        data-testid='codeinjection-foot'
                                        editable={!disabled}
                                        extensions={htmlExtensions}
                                        height='128px'
                                        title={<>Tag footer <code className='ml-1 font-normal'>{'{{ghost_foot}}'}</code></>}
                                        value={draft.codeinjectionFoot}
                                        onChange={value => onChange({codeinjectionFoot: value})}
                                    />
                                </Stack>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </Grid>
    );
};

export default TagDetailForm;
