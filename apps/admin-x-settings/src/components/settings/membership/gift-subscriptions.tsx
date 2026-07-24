import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue} from '@tryghost/shade/components';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {useGlobalData} from '../../providers/global-data-provider';
import {withErrorBoundary} from '../../error-boundary';

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {siteData} = useGlobalData();
    const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

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
                <CopyField value={giftUrl}>
                    <CopyFieldLabel>Shareable link</CopyFieldLabel>
                    <CopyFieldContent>
                        <CopyFieldValue data-testid='gift-url' />
                        <CopyFieldActions>
                            <Button data-testid='preview-shareable-link' size='sm' type='button' variant='ghost' onClick={openPreview}>Preview</Button>
                            <CopyFieldCopyButton copiedLabel='Copied' data-testid='copy-shareable-link'>Copy link</CopyFieldCopyButton>
                        </CopyFieldActions>
                    </CopyFieldContent>
                </CopyField>
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(GiftSubscriptions, 'Gift subscriptions');
