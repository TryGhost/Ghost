import AppContext from '../../../../AppContext';
import ActionButton from '../../../common/ActionButton';
import {isSignupAllowed} from '../../../../utils/helpers';
import {useContext} from 'react';

const SubscribeButton = () => {
    const {site, action, brandColor, onAction, t} = useContext(AppContext);

    if (!isSignupAllowed({site})) {
        return null;
    }
    const isRunning = ['checkoutPlan:running'].includes(action);

    const openPlanPage = () => {
        onAction('switchPage', {
            page: 'accountPlan',
            lastPage: 'accountHome'
        });
    };
    return (
        <ActionButton
            dataTestId={'view-plans'}
            isRunning={isRunning}
            label={t('View plans')}
            onClick={() => openPlanPage()}
            brandColor={brandColor}
            style={{width: '100%'}}
        />
    );
};

export default SubscribeButton;
