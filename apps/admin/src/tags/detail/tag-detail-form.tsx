import React from 'react';
import TagColorField from './tag-color-field';
import TagImageField from './tag-image-field';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger, Card, CardContent, CodeEditor, FieldError, Input, Label, Textarea} from '@tryghost/shade/components';
import {Stack} from '@tryghost/shade/primitives';
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
    <AccordionTrigger className='hover:no-underline'>
        <span className='flex flex-col gap-0.5 text-left'>
            <span className='text-base font-semibold'>{title}</span>
            <span className='text-sm font-normal text-muted-foreground'>{description}</span>
        </span>
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
        <div className='flex flex-col gap-8' data-testid='tag-detail-form'>
            {/* Card 1 mirrors Ember's main form block; card 2 groups the
                collapsible sections — the member detail screen's card idiom. */}
            <Card>
                <CardContent className='p-6'>
                    <div className='grid items-start gap-6 lg:grid-cols-2'>
                        <div className='flex flex-col gap-5'>
                            <div className='flex items-start gap-3'>
                                <div className='flex flex-1 flex-col gap-1.5'>
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
                                </div>
                                <TagColorField
                                    disabled={disabled}
                                    errorId={errors.accentColor ? errorId('accentColor') : undefined}
                                    value={draft.accentColor}
                                    onChange={accentColor => onChange({accentColor})}
                                    onError={message => onFieldError('accentColor', message)}
                                />
                            </div>
                            <div className='-mt-4 flex flex-col gap-1'>
                                <FieldError className='text-sm' id={errorId('name')}>{errors.name}</FieldError>
                                <FieldError className='text-sm' id={errorId('accentColor')}>{errors.accentColor}</FieldError>
                                <p className='text-sm text-muted-foreground'>
                                    Start with # to create internal tags.{' '}
                                    <a className='underline' href='https://ghost.org/help/organising-content/#private-tags' rel='noopener noreferrer' target='_blank'>Learn more</a>
                                </p>
                            </div>

                            <div className='flex flex-col gap-1.5'>
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
                            </div>

                            <div className='flex flex-col gap-1.5'>
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
                            </div>
                        </div>

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
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className='px-6 py-2'>
                    <Accordion type='multiple'>
                        <AccordionItem className='last:border-b-0' value='metadata'>
                            <SectionTrigger description='Extra content for search engines.' title='Meta data' />
                            <AccordionContent>
                                <div className='grid items-start gap-6 pt-2 lg:grid-cols-3'>
                                    <div className='flex flex-col gap-5 lg:col-span-2'>
                                        <div className='flex flex-col gap-1.5'>
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
                                        </div>
                                        <div className='flex flex-col gap-1.5'>
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
                                        </div>
                                        <div className='flex flex-col gap-1.5'>
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
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-1.5'>
                                        <Label>Search Engine Result Preview</Label>
                                        <SeoPreview description={seoDescription} title={seoTitle} url={seoUrl} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem className='last:border-b-0' value='x-card'>
                            <SectionTrigger description='Customized structured data for X.' title='X card' />
                            <AccordionContent>
                                <div className='grid items-start gap-6 pt-2 lg:grid-cols-3'>
                                    <div className='flex flex-col gap-5 lg:col-span-2'>
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
                                        <div className='flex flex-col gap-1.5'>
                                            <Label htmlFor='twitter-title'>X title</Label>
                                            <Input
                                                disabled={disabled}
                                                id='twitter-title'
                                                placeholder={draft.name}
                                                value={draft.twitterTitle}
                                                onChange={e => onChange({twitterTitle: e.target.value})}
                                            />
                                            <UsedCharacters limit={X_TITLE_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.twitterTitle} />
                                        </div>
                                        <div className='flex flex-col gap-1.5'>
                                            <Label htmlFor='twitter-description'>X description</Label>
                                            <Textarea
                                                disabled={disabled}
                                                id='twitter-description'
                                                placeholder={draft.description}
                                                value={draft.twitterDescription}
                                                onChange={e => onChange({twitterDescription: e.target.value})}
                                            />
                                            <UsedCharacters limit={X_DESCRIPTION_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.twitterDescription} />
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-1.5'>
                                        <Label>X preview</Label>
                                        <XCardPreview
                                            description={draft.twitterDescription || seoDescription || siteMetaDescription || ''}
                                            domain={blogDomain}
                                            image={draft.twitterImage || draft.featureImage}
                                            siteHeader={socialSiteHeader}
                                            title={draft.twitterTitle || seoTitle}
                                        />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem className='last:border-b-0' value='facebook-card'>
                            <SectionTrigger description='Customize Open Graph data.' title='Facebook card' />
                            <AccordionContent>
                                <div className='grid items-start gap-6 pt-2 lg:grid-cols-3'>
                                    <div className='flex flex-col gap-5 lg:col-span-2'>
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
                                        <div className='flex flex-col gap-1.5'>
                                            <Label htmlFor='og-title'>Facebook title</Label>
                                            <Input
                                                disabled={disabled}
                                                id='og-title'
                                                placeholder={draft.name}
                                                value={draft.ogTitle}
                                                onChange={e => onChange({ogTitle: e.target.value})}
                                            />
                                            <UsedCharacters limit={FACEBOOK_TITLE_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.ogTitle} />
                                        </div>
                                        <div className='flex flex-col gap-1.5'>
                                            <Label htmlFor='og-description'>Facebook description</Label>
                                            <Textarea
                                                disabled={disabled}
                                                id='og-description'
                                                placeholder={draft.description}
                                                value={draft.ogDescription}
                                                onChange={e => onChange({ogDescription: e.target.value})}
                                            />
                                            <UsedCharacters limit={FACEBOOK_DESCRIPTION_RECOMMENDED_LENGTH} prefix='Recommended' value={draft.ogDescription} />
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-1.5'>
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
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem className='last:border-b-0' value='code-injection'>
                            <SectionTrigger description='Add styles/scripts to the header and footer.' title='Code injection' />
                            <AccordionContent>
                                <Stack className='pt-2' gap='lg'>
                                    <CodeEditor
                                        data-testid='codeinjection-head'
                                        editable={!disabled}
                                        extensions={htmlExtensions}
                                        height='128px'
                                        title={<>Tag header <code className='ml-1 font-normal'>{'{{ghost_head}}'}</code></>}
                                        value={draft.codeinjectionHead}
                                        onChange={(value: string) => onChange({codeinjectionHead: value})}
                                    />
                                    <CodeEditor
                                        data-testid='codeinjection-foot'
                                        editable={!disabled}
                                        extensions={htmlExtensions}
                                        height='128px'
                                        title={<>Tag footer <code className='ml-1 font-normal'>{'{{ghost_foot}}'}</code></>}
                                        value={draft.codeinjectionFoot}
                                        onChange={(value: string) => onChange({codeinjectionFoot: value})}
                                    />
                                </Stack>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
};

export default TagDetailForm;
