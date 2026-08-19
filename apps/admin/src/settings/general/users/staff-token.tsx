import APIKeys from '@/settings/advanced/integrations/api-keys';
import {Text} from '@tryghost/shade/primitives';
import {genStaffToken, getStaffToken} from '@tryghost/admin-x-framework/api/staff-token';
import {useConfirmation} from '@/settings/providers/confirmation-context';
import {useEffect, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const StaffToken: React.FC = () => {
    const {refetch: apiKey} = getStaffToken({
        enabled: false
    });
    const handleError = useHandleError();
    const {confirm} = useConfirmation();
    const [token, setToken] = useState('');
    const {mutateAsync: newApiKey} = genStaffToken();

    useEffect(() => {
        const getApiKey = async () => {
            const newAPI = await apiKey();
            if (newAPI?.data?.apiKey) {
                setToken(`${newAPI.data.apiKey.id}:${newAPI.data.apiKey.secret}`);
            }
        };
        void getApiKey();
    }, [apiKey]);

    const genConfirmation = () => {
        confirm({
            title: 'Regenerate your Staff Access Token',
            prompt: 'You can regenerate your Staff Access Token any time, but any scripts or applications using it will need to be updated.',
            okLabel: 'Regenerate your Staff Access Token',
            okVariant: 'destructive',
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
            <Text as='h6' className='mb-2 text-base' weight='semibold'>Staff access token</Text>
            <APIKeys hasLabel={false} keys={[
                {
                    id: 'staff-access-token',
                    text: token || '',
                    onRegenerate: genConfirmation
                }]} />
        </div>
    );
};

export default StaffToken;
