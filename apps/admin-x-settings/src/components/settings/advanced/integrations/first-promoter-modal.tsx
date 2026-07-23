import BrandIcon from '../../../icons/brand-icon';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {Field, FieldContent, FieldDescription, FieldLabel, Input, Switch} from '@tryghost/shade/components';
import {Form, Modal} from '@tryghost/admin-x-design-system';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
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
        <Modal
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
                <Form className='[&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted' marginBottom={false} title='FirstPromoter configuration' grouped>
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
                </Form>
            </div>
        </Modal>
    );
});

export default FirstPromoterModal;
