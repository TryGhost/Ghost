import React, {useEffect, useMemo, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Button, Heading, HtmlField, ImageUpload, SettingGroupContent, TextField, Toggle, confirmIfDirty} from '@tryghost/admin-x-design-system';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {withErrorBoundary} from '../../error-boundary';

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        siteData,
        updateSetting,
        saveState,
        handleSave,
        handleCancel,
        handleEditingChange
    } = useSettingGroup();

    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    const [giftPageHeading, giftPageDescription, giftPageImage] = getSettingValues<string | null>(
        localSettings,
        ['gift_page_heading', 'gift_page_description', 'gift_page_image']
    );

    const [giftSubscriptionsEnabled] = getSettingValues(localSettings, ['gift_subscriptions_enabled']) as [boolean];

    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Text over this length is collapsed behind a "Show more" toggle on the gift page
    const descriptionRecommendedLength = 240;
    const descriptionLength = useMemo(() => {
        const div = document.createElement('div');
        div.innerHTML = giftPageDescription?.toString() || '';
        return div.innerText.trim().length;
    }, [giftPageDescription]);

    // Watch for changes in localSettings and update editing state
    useEffect(() => {
        const hasChanges = localSettings.some(setting => setting.dirty);
        if (hasChanges && !isEditing) {
            setIsEditing(true);
            handleEditingChange(true);
        }
    }, [localSettings, isEditing, handleEditingChange]);

    const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

    const copyGiftUrl = () => {
        navigator.clipboard.writeText(giftUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openPreview = () => {
        confirmIfDirty(saveState === 'unsaved', () => window.open(giftUrl, '_blank'));
    };

    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('gift_subscriptions_enabled', e.target.checked);
    };

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            updateSetting('gift_page_image', imageUrl);
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    const handleImageDelete = () => {
        updateSetting('gift_page_image', null);
    };

    const handleCancelClick = () => {
        handleCancel();
        setIsEditing(false);
    };

    const handleSaveClick = async () => {
        const response = await handleSave();
        if (response) {
            setIsEditing(false);
        }
    };

    return (
        <TopLevelGroup
            description={<>Allow your readers to share your work by purchasing a gift subscription for a friend or colleague. <a className='text-green' href="https://ghost.org/help/gift-subscriptions/" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            isEditing={isEditing}
            keywords={keywords}
            navid='gift-subscriptions'
            saveState={saveState}
            testId='gift-subscriptions'
            title="Gift subscriptions"
            hideEditButton
            onCancel={handleCancelClick}
            onEditingChange={setIsEditing}
            onSave={handleSaveClick}
        >
            <SettingGroupContent columns={1}>
                <Toggle
                    checked={giftSubscriptionsEnabled !== false}
                    direction='rtl'
                    label='Enable gift subscriptions'
                    testId='gift-subscriptions-toggle'
                    onChange={handleToggleChange}
                />
                {giftSubscriptionsEnabled !== false && (
                    <>
                        <TextField
                            maxLength={100}
                            placeholder="Gift a membership"
                            title="Heading"
                            value={giftPageHeading || ''}
                            onChange={e => updateSetting('gift_page_heading', e.target.value || null)}
                        />
                        <HtmlField
                            hint={<>Sell the value of a gift membership to potential buyers. Recommended: <strong>{descriptionRecommendedLength}</strong> characters. You&apos;ve used <strong className={descriptionLength > descriptionRecommendedLength ? 'text-yellow-500' : 'text-green'}>{descriptionLength}</strong>{descriptionLength > descriptionRecommendedLength ? ' — longer text is collapsed behind a "Show more" toggle' : ''}</>}
                            nodes='MINIMAL_NODES'
                            placeholder={`Share a full membership to ${siteData?.title || 'your site'} with a friend or colleague`}
                            title="Description"
                            value={giftPageDescription?.toString() || ''}
                            onChange={html => updateSetting('gift_page_description', html || null)}
                        />
                        <div>
                            <Heading className='mb-2' level={6} grey>Image</Heading>
                            <ImageUpload
                                deleteButtonClassName='!top-1 !right-1'
                                height={giftPageImage ? '160px' : '60px'}
                                id='gift-page-image'
                                imageURL={giftPageImage || ''}
                                onDelete={handleImageDelete}
                                onUpload={handleImageUpload}
                            >
                                Upload gift page image
                            </ImageUpload>
                            <p className='mt-1 text-xs text-grey-700'>Shown above the heading at up to 140px tall — logos and wide images work best.</p>
                        </div>
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
                    </>
                )}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(GiftSubscriptions, 'Gift subscriptions');
