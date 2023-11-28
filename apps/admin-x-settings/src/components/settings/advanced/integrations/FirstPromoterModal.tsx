import IntegrationHeader from './IntegrationHeader';
import NiceModal from '@ebay/nice-modal-react';
import {Form, Modal, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {ReactComponent as Icon} from '../../../../assets/icons/firstpromoter.svg';
import {Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const FirstpromoterModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();

    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const [accountId, setAccountId] = useState<string | null>('');
    const [enabled, setEnabled] = useState(false);

    const [firstPromoterEnabled] = getSettingValues<boolean>(settings, ['firstpromoter']);
    const [firstPromoterId] = getSettingValues<string>(settings, ['firstpromoter_id']);

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

        await editSettings(updates);
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            dirty={enabled !== firstPromoterEnabled || accountId !== firstPromoterId}
            okColor='black'
            okLabel='Save & close'
            testId='firstpromoter-modal'
            title=''
            onOk={async () => {
                try {
                    await handleSave();
                    updateRoute('integrations');
                    modal.remove();
                } catch (e) {
                    handleError(e);
                }
            }}
        >
            <IntegrationHeader
                detail='Launch your own member referral program'
                icon={<Icon className='-mt-2 h-14 w-14' />}
                title='FirstPromoter'
            />
            <div className='mt-7'>
                <Form marginBottom={false} title='FirstPromoter configuration' grouped>
                    <Toggle
                        checked={enabled}
                        direction='rtl'
                        hint={<>Enable <a className='text-green' href="https://firstpromoter.com/?fpr=ghost&fp_sid=admin" rel="noopener noreferrer" target="_blank">FirstPromoter</a> for tracking referrals</>}
                        label='Enable FirstPromoter'
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                        }}
                    />
                    {enabled && (
                        <TextField
                            hint={<>
                                Affiliate and referral tracking, find your ID  <a className='text-green' href="https://ghost.org/help/firstpromoter-id/" rel="noopener noreferrer" target="_blank">here</a>
                            </>}
                            placeholder='XXXXXXXX'
                            title='FirstPromoter account ID'
                            value={accountId || ''}
                            onChange={(e) => {
                                setAccountId(e.target.value);
                            }}
                        />
                    )}
                </Form>
            </div>
        </Modal>
    );
});

export default FirstpromoterModal;
