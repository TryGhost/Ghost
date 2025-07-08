import CTABox from '../content/CTABox';
import CloseButton from './CloseButton';
import {useAppContext} from '../../AppContext';

const CTAPopup = () => {
    const {dispatchAction, member, commentsEnabled} = useAppContext();

    const stopPropagation = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const close = () => {
        dispatchAction('closePopup', {});
    };

    const paidOnly = commentsEnabled === 'paid';
    const isFirst = !member;

    return (
        <div className="shadow-modal relative h-screen w-screen rounded-none bg-white p-[28px] text-center sm:h-auto sm:w-[500px] sm:rounded-xl sm:p-8 sm:text-left" onClick={close} onMouseDown={stopPropagation}>
            <div className="flex h-full flex-col justify-center pt-10 sm:justify-normal sm:pt-0">
                <div className="flex flex-col items-center pb-3 pt-6" data-testid="cta-box">
                    <CTABox isFirst={isFirst} isPaid={paidOnly} />
                </div>
                <CloseButton close={close} />
            </div>
        </div>
    );
};

export default CTAPopup;