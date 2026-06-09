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
import {ImageUploadField} from './image-upload-field';
import {SearchEnginePreview, SocialCardPreview} from './seo-previews';
import {useFormContext, useWatch} from 'react-hook-form';
import type {TagFormValues} from '../tag-form-schema';

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
    const values = useWatch({control: form.control}) as TagFormValues;

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

            <AccordionItem value="x-card">
                <AccordionTrigger data-testid="expand-x-card">
                    {sectionHeader('X card', 'Customized structured data for X.')}
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid gap-6 p-1 md:grid-cols-2">
                        <div className="flex flex-col gap-5">
                            <ImageUploadField label="X image" name="twitterImage" uploadText="Add X image" />
                            <FormField
                                control={form.control}
                                name="twitterTitle"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>X title</FormLabel>
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
                                name="twitterDescription"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>X description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={values.description} {...field} />
                                        </FormControl>
                                        <CharCountdown max={125} value={field.value} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <SocialCardPreview
                            description={values.twitterDescription || seoDescription}
                            domain={domain}
                            image={values.twitterImage || values.featureImage}
                            network="x"
                            title={values.twitterTitle || seoTitle}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="facebook-card">
                <AccordionTrigger data-testid="expand-facebook-card">
                    {sectionHeader('Facebook card', 'Customize Open Graph data.')}
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid gap-6 p-1 md:grid-cols-2">
                        <div className="flex flex-col gap-5">
                            <ImageUploadField label="Facebook image" name="ogImage" uploadText="Add Facebook image" />
                            <FormField
                                control={form.control}
                                name="ogTitle"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Facebook title</FormLabel>
                                        <FormControl>
                                            <Input placeholder={values.name} {...field} />
                                        </FormControl>
                                        <CharCountdown max={100} value={field.value} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ogDescription"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Facebook description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={values.description} {...field} />
                                        </FormControl>
                                        <CharCountdown max={65} value={field.value} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <SocialCardPreview
                            description={values.ogDescription || seoDescription}
                            domain={domain}
                            image={values.ogImage || values.featureImage}
                            network="facebook"
                            title={values.ogTitle || seoTitle}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

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
                                        <Textarea className="min-h-32 font-mono text-sm" spellCheck={false} {...field} />
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
                                        <Textarea className="min-h-32 font-mono text-sm" spellCheck={false} {...field} />
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
