import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Textarea
} from '@tryghost/shade/components';
import {CharCountdown} from './char-countdown';
import {CodeEditor} from '@tryghost/admin-x-design-system';
import {ImageUploadField} from './image-upload-field';
import {SearchEnginePreview, SocialCardPreview} from './seo-previews';
import {useFormContext, useWatch} from 'react-hook-form';
import {useMemo} from 'react';
import type {TagFormValues} from '../tag-form-schema';

// Only the fields the SEO/social previews derive from — keystrokes in other
// fields (slug, color, code injection) must not re-render the whole accordion.
const PREVIEW_FIELDS = [
    'name',
    'description',
    'metaTitle',
    'metaDescription',
    'canonicalUrl',
    'featureImage',
    'twitterImage',
    'twitterTitle',
    'twitterDescription',
    'ogImage',
    'ogTitle',
    'ogDescription'
] as const;

const SOCIAL_CARDS = [
    {
        network: 'x' as const,
        accordionValue: 'x-card',
        testId: 'expand-x-card',
        title: 'X card',
        description: 'Customized structured data for X.',
        imageField: 'twitterImage' as const,
        imageLabel: 'X image',
        imageUploadText: 'Add X image',
        titleField: 'twitterTitle' as const,
        titleLabel: 'X title',
        titleMax: 70,
        descriptionField: 'twitterDescription' as const,
        descriptionLabel: 'X description',
        descriptionMax: 125
    },
    {
        network: 'facebook' as const,
        accordionValue: 'facebook-card',
        testId: 'expand-facebook-card',
        title: 'Facebook card',
        description: 'Customize Open Graph data.',
        imageField: 'ogImage' as const,
        imageLabel: 'Facebook image',
        imageUploadText: 'Add Facebook image',
        titleField: 'ogTitle' as const,
        titleLabel: 'Facebook title',
        titleMax: 100,
        descriptionField: 'ogDescription' as const,
        descriptionLabel: 'Facebook description',
        descriptionMax: 65
    }
];

function sectionHeader(title: string, description: string) {
    return (
        <div className="flex flex-col items-start gap-0.5 text-left">
            <h4 className="text-base font-semibold">{title}</h4>
            <p className="text-sm font-normal text-muted-foreground">{description}</p>
        </div>
    );
}

export function TagExpandableSections({siteTitle, siteUrl, tagUrl}: {
    siteTitle: string;
    siteUrl: string;
    tagUrl: string;
}) {
    const form = useFormContext<TagFormValues>();
    // CodeMirror's HTML language pack is loaded on demand (same pattern as
    // admin-x-settings' code-injection modal); CodeEditor itself is React.lazy
    // so CodeMirror stays out of the main bundle until the section is opened.
    const htmlExtensions = useMemo(() => [import('@codemirror/lang-html').then(module => module.html())], []);
    const watched = useWatch({control: form.control, name: [...PREVIEW_FIELDS]});
    const values = Object.fromEntries(PREVIEW_FIELDS.map((field, i) => [field, watched[i]])) as Pick<TagFormValues, typeof PREVIEW_FIELDS[number]>;

    const domain = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const fallbackTitle = siteTitle ? `${values.name} - ${siteTitle}` : values.name;
    const seoTitle = values.metaTitle || fallbackTitle;
    const seoDescription = values.metaDescription || values.description;
    const seoUrl = values.canonicalUrl || tagUrl;

    return (
        <Accordion type="multiple">
            <AccordionItem value="meta-data">
                <AccordionTrigger data-testid="expand-meta-data">
                    {sectionHeader('Meta data', 'Extra content for search engines.')}
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid gap-6 p-1 md:grid-cols-2">
                        <div className="flex flex-col gap-5">
                            <FormField
                                control={form.control}
                                name="metaTitle"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Meta title</FormLabel>
                                        <FormControl>
                                            <Input placeholder={values.name} {...field} />
                                        </FormControl>
                                        <CharCountdown max={70} value={field.value} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="metaDescription"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Meta description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={values.description} {...field} />
                                        </FormControl>
                                        <CharCountdown max={156} value={field.value} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="canonicalUrl"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Canonical URL</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <SearchEnginePreview
                            description={seoDescription}
                            title={seoTitle}
                            url={seoUrl}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

            {SOCIAL_CARDS.map(card => (
                <AccordionItem key={card.accordionValue} value={card.accordionValue}>
                    <AccordionTrigger data-testid={card.testId}>
                        {sectionHeader(card.title, card.description)}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid gap-6 p-1 md:grid-cols-2">
                            <div className="flex flex-col gap-5">
                                <ImageUploadField label={card.imageLabel} name={card.imageField} uploadText={card.imageUploadText} />
                                <FormField
                                    control={form.control}
                                    name={card.titleField}
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>{card.titleLabel}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={values.name} {...field} />
                                            </FormControl>
                                            <CharCountdown max={card.titleMax} value={field.value} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={card.descriptionField}
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>{card.descriptionLabel}</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder={values.description} {...field} />
                                            </FormControl>
                                            <CharCountdown max={card.descriptionMax} value={field.value} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <SocialCardPreview
                                description={values[card.descriptionField] || seoDescription}
                                domain={domain}
                                image={values[card.imageField] || values.featureImage}
                                network={card.network}
                                title={values[card.titleField] || seoTitle}
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}

            <AccordionItem value="code-injection">
                <AccordionTrigger data-testid="expand-code-injection">
                    {sectionHeader('Code injection', 'Add styles/scripts to the header and footer.')}
                </AccordionTrigger>
                <AccordionContent>
                    <div className="flex flex-col gap-5 p-1">
                        <FormField
                            control={form.control}
                            name="codeinjectionHead"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Tag header <code className="ml-1 font-normal">{'{{ghost_head}}'}</code></FormLabel>
                                    <FormControl>
                                        <CodeEditor
                                            data-testid="codeinjection-head-editor"
                                            extensions={htmlExtensions}
                                            value={field.value}
                                            onBlur={field.onBlur}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="codeinjectionFoot"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Tag footer <code className="ml-1 font-normal">{'{{ghost_foot}}'}</code></FormLabel>
                                    <FormControl>
                                        <CodeEditor
                                            data-testid="codeinjection-foot-editor"
                                            extensions={htmlExtensions}
                                            value={field.value}
                                            onBlur={field.onBlur}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
