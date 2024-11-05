import {PopupFrame} from '../Frame';
import {Transition} from '@headlessui/react';
import {useAppContext} from '../../AppContext';
import {useEffect} from 'react';

type Props = {
    show: boolean;
    title: string;
    callback?: (result: boolean) => void;
    children: React.ReactNode;
};
const GenericPopup: React.FC<Props> = ({show, children, title, callback}) => {
    // The modal will cover the whole screen, so while it is hidden, we need to disable pointer events
    const {dispatchAction} = useAppContext();

    const close = () => {
        dispatchAction('closePopup', {});
        if (callback) {
            callback(false);
        }
    };

    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };
        window.addEventListener('keydown', listener, {passive: true});

        return () => {
            window.removeEventListener('keydown', listener, {passive: true} as any);
        };
    });

    return (
        <Transition appear={true} show={show}>
            <PopupFrame title={title}>
                <div>
                    <Transition.Child
                        enter="transition duration-200 linear"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition duration-200 linear"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="to-rgba(0,0,0,0.1) fixed left-0 top-0 flex h-screen w-screen justify-center overflow-hidden bg-gradient-to-b from-[rgba(0,0,0,0.2)] pt-0 backdrop-blur-[2px] sm:pt-[4vmin]" onMouseDown={close}>
                            <Transition.Child
                                enter="transition duration-200 delay-150 linear"
                                enterFrom="translate-y-4 opacity-0"
                                enterTo="translate-y-0 opacity-100"
                                leave="transition duration-200 linear"
                                leaveFrom="translate-y-0 opacity-100"
                                leaveTo="translate-y-4 opacity-0"
                            >
                                {children}
                            </Transition.Child>
                        </div>
                    </Transition.Child>
                </div>
            </PopupFrame>
        </Transition>
    );
};

export default GenericPopup;
