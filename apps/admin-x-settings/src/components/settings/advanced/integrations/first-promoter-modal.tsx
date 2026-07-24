import BrandIcon from '../../../icons/brand-icon';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, Input, Switch} from '@tryghost/shade/components';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SettingsModal} from '@tryghost/shade/patterns';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const FirstPromoterModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();

    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const [accountId, setAccountId] = useState<string | null>('');

    const [firstPromoterEnabled] = getSettingValues<boolean>(settings, ['firstpromoter']);
    const [firstPromoterId] = getSettingValues<string>(settings, ['firstpromoter_id']);

    const [okLabel, setOkLabel] = useState('Save');
    const [enabled, setEnabled] = useState<boolean>(!!firstPromoterEnabled);

    useEffect(() => {
        setEnabled(firstPromoterEnabled || false);
        setAccountId(firstPromoterId || null);
    }, [firstPromoterEnabled, firstPromoterId]);

    const handleSave = async () => {
        const updates: Setting[] = [
            {
                key: 'firstpromoter',
                value: enabled
            },
            {
                key: 'firstpromoter_id',
                value: accountId
            }
        ];
        try {
            setOkLabel('Saving...');
            await Promise.all([
                editSettings(updates),
                new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                })
            ]);
            setOkLabel('Saved');
        } catch (e) {
            handleError(e);
        } finally {
            setTimeout(() => setOkLabel('Save'), 1000);
        }
    };

    return (
        <SettingsModal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={enabled !== firstPromoterEnabled || accountId !== firstPromoterId}
            okLabel={okLabel}
            okVariant='default'
            testId='firstpromoter-modal'
            title=''
            onOk={async () => {
                try {
                    await handleSave();
                } catch (e) {
                    handleError(e);
                }
            }}
        >
            <IntegrationHeader
                detail='Launch your own member referral program'
                icon={<BrandIcon className='-mt-2' name='firstpromoter' size={56} />}
                title='FirstPromoter'
            />
            <div className='mt-7'>
                <FieldSet className='gap-0'>
                    <FieldLegend className='mb-3 text-md! leading-supertight font-bold md:text-lg!'>FirstPromoter configuration</FieldLegend>
                    <FieldGroup className='gap-8 rounded-sm border border-border-default p-4 md:p-7 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                    <Field orientation='horizontal'>
                        <FieldContent>
                            <FieldLabel htmlFor='firstpromoter-enabled'>Enable FirstPromoter</FieldLabel>
                            <FieldDescription>Enable <a className='text-green' href="https://firstpromoter.com/?fpr=ghost&fp_sid=admin" rel="noopener noreferrer" target="_blank">FirstPromoter</a> for tracking referrals</FieldDescription>
                        </FieldContent>
                        <Switch checked={enabled} id='firstpromoter-enabled' onCheckedChange={setEnabled} />
                    </Field>
                    {enabled && (
                        <Field>
                            <FieldLabel htmlFor='firstpromoter-account-id'>FirstPromoter account ID</FieldLabel>
                            <Input
                                id='firstpromoter-account-id'
                                placeholder='XXXXXXXX'
                                value={accountId || ''}
                                onChange={e => setAccountId(e.target.value)}
                            />
                            <FieldDescription><>
                                Affiliate and referral tracking, find your ID  <a className='text-green' href="https://ghost.org/help/firstpromoter-id/" rel="noopener noreferrer" target="_blank">here</a>
                            </></FieldDescription>
                        </Field>
                    )}
                    </FieldGroup>
                </FieldSet>
            </div>
        </SettingsModal>
    );
});

export default FirstPromoterModal;
