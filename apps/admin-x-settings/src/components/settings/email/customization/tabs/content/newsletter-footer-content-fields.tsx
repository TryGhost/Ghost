import {Form, HtmlField, Icon, Separator, Toggle, ToggleGroup} from '@tryghost/admin-x-design-system';
import type {NewsletterCustomizationDraft} from '../../types';

type NewsletterFooterContentFieldsProps = {
    draft: NewsletterCustomizationDraft;
    commentsEnabled: boolean;
    updateDraft: (fields: Partial<NewsletterCustomizationDraft>) => void;
};

const NewsletterFooterContentFields: React.FC<NewsletterFooterContentFieldsProps> = ({draft, commentsEnabled, updateDraft}) => {
    return (
        <>
            <Form className='mt-6' gap='sm' margins='lg' title='Footer'>
                <ToggleGroup gap='lg'>
                    <Toggle
                        checked={draft.feedback_enabled}
                        direction='rtl'
                        label='Ask your readers for feedback'
                        onChange={(event) => {
                            updateDraft({feedback_enabled: event.target.checked});
                        }}
                    />
                    {commentsEnabled && <Toggle
                        checked={draft.show_comment_cta}
                        direction='rtl'
                        label='Add a link to your comments'
                        onChange={(event) => {
                            updateDraft({show_comment_cta: event.target.checked});
                        }}
                    />}
                    <Toggle
                        checked={draft.show_latest_posts}
                        direction='rtl'
                        label='Share your latest posts'
                        onChange={(event) => {
                            updateDraft({show_latest_posts: event.target.checked});
                        }}
                    />
                    <Toggle
                        checked={draft.show_subscription_details}
                        direction='rtl'
                        label='Show subscription details'
                        onChange={(event) => {
                            updateDraft({show_subscription_details: event.target.checked});
                        }}
                    />
                </ToggleGroup>
                <HtmlField
                    hint='Any extra information or legal text'
                    nodes='MINIMAL_NODES'
                    placeholder=' '
                    title='Email footer'
                    value={draft.footer_content || ''}
                    onChange={(html) => {
                        updateDraft({footer_content: html});
                    }}
                />
            </Form>
            <Separator />
            <div className='my-5 flex w-full items-start'>
                <span>
                    <Icon className='mr-2 mt-[-1px]' colorClass='text-red' name='heart' />
                </span>
                <Form marginBottom={false}>
                    <Toggle
                        checked={draft.show_badge}
                        direction='rtl'
                        label={(
                            <div className='flex flex-col gap-0.5'>
                                <span className='text-sm md:text-base'>Promote independent publishing</span>
                                <span className='text-grey-700 text-[11px] leading-tight md:text-xs md:leading-tight'>Show you&apos;re a part of the indie publishing movement with a small badge in the footer</span>
                            </div>
                        )}
                        labelStyle='value'
                        onChange={(event) => {
                            updateDraft({show_badge: event.target.checked});
                        }}
                    />
                </Form>
            </div>
        </>
    );
};

export default NewsletterFooterContentFields;
