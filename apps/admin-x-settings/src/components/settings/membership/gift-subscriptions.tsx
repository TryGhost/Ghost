import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Heading, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useGlobalData} from '../../providers/global-data-provider';

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {siteData} = useGlobalData();
    const [copied, setCopied] = useState(false);

    const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

    const copyGiftUrl = () => {
        navigator.clipboard.writeText(giftUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openPreview = () => {
        window.open(giftUrl, '_blank');
    };

    return (
        <TopLevelGroup
            description={<>Allow your readers to share your work by purchasing a gift subscription for a friend or colleague. <a className='text-green' href="https://ghost.org/help/gift-subscriptions/" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid='gift-subscriptions'
            testId='gift-subscriptions'
            title="Gift subscriptions"
            hideEditButton
        >
            <SettingGroupContent columns={1}>
                <div className='w-100'>
                    <div className='flex items-center gap-2'>
                        <Heading level={6}>Shareable link</Heading>
                    </div>
                    <div className='group relative mt-0 flex w-100 items-center justify-between overflow-hidden border-b border-transparent pt-1 pb-2 hover:border-grey-300 dark:hover:border-grey-600'>
                        <span data-testid='gift-url'>{giftUrl}</span>
                        <div className='invisible flex gap-1 bg-white pl-1 group-hover:visible dark:bg-black'>
                            <Button color='clear' data-testid='preview-shareable-link' label={'Preview'} size='sm' onClick={openPreview} />
                            <Button color='light-grey' data-testid='copy-shareable-link' label={copied ? 'Copied' : 'Copy link'} size='sm' onClick={copyGiftUrl} />
                        </div>
                    </div>
                </div>
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(GiftSubscriptions, 'Gift subscriptions');
