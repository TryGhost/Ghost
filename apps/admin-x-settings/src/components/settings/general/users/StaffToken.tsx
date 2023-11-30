import APIKeys from '../../advanced/integrations/APIKeys';
import NiceModal from '@ebay/nice-modal-react';
import {ConfirmationModal, Heading} from '@tryghost/admin-x-design-system';
import {genStaffToken, getStaffToken} from '@tryghost/admin-x-framework/api/staffToken';
import {useEffect, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const StaffToken: React.FC = () => {
    const {refetch: apiKey} = getStaffToken({
        enabled: false
    });
    const handleError = useHandleError();
    const [token, setToken] = useState('');
    const {mutateAsync: newApiKey} = genStaffToken();

    useEffect(() => {
        const getApiKey = async () => {
            const newAPI = await apiKey();
            if (newAPI?.data?.apiKey) {
                setToken(`${newAPI.data.apiKey.id}:${newAPI.data.apiKey.secret}`);
            }
        };
        getApiKey();
    } , [apiKey]);

    const genConfirmation = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Regenerate your Staff Access Token',
            prompt: 'You can regenerate your Staff Access Token any time, but any scripts or applications using it will need to be updated.',
            okLabel: 'Regenerate your Staff Access Token',
            okColor: 'red',
            onOk: async (modal) => {
                try {
                    const newAPI = await newApiKey([]);
                    setToken(`${newAPI.apiKey.id}:${newAPI.apiKey.secret}`);
                    modal?.remove();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };
    return (
        <div>
            <Heading className='mb-2' level={6} grey>Staff access token</Heading>
            <APIKeys hasLabel={false} keys={[
                {
                    text: token || '',
                    onRegenerate: genConfirmation
                }]} />
        </div>
    );
};

export default StaffToken;
