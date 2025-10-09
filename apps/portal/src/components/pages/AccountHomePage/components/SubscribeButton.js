import AppContext from '../../../../AppContext';
import ActionButton from '../../../common/ActionButton';
import {isSignupAllowed, hasAvailablePrices} from '../../../../utils/helpers';
import {useContext} from 'react';
import {t} from '../../../../utils/i18n';

const SubscribeButton = () => {
    const {site, action, brandColor, doAction} = useContext(AppContext);

    if (!isSignupAllowed({site}) || !hasAvailablePrices({site})) {
        return null;
    }
    const isRunning = ['checkoutPlan:running'].includes(action);

    const openPlanPage = () => {
        doAction('switchPage', {
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
