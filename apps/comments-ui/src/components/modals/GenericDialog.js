import React from 'react';
import {Transition} from '@headlessui/react';
import Modal from './Modal';

const GenericDialog = (props) => {
    // The modal will cover the whole screen, so while it is hidden, we need to disable pointer events
    const style = props.show ? {} : {
        pointerEvents: 'none'
    };
    return (
        <Modal show={props.show} style={style}>
            <div>
                <Transition
                    show={props.show}
                    enter="transition duration-200 linear"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition duration-200 linear"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed top-0 left-0 overflow-hidden w-screen h-screen flex pt-12 justify-center bg-gradient-to-b from-[rgba(0,0,0,0.2)] to-rgba(0,0,0,0.1) backdrop-blur-[2px]" onClick={props.cancel}>
                        <Transition.Child
                            enter="transition duration-200 delay-150 linear"
                            enterFrom="translate-y-4 opacity-0"
                            enterTo="translate-y-0 opacity-100"
                            leave="transition duration-200 linear"
                            leaveFrom="translate-y-0 opacity-100"
                            leaveTo="translate-y-4 opacity-0"
                        >
                            <div className="bg-white w-[500px] p-8 rounded-xl text-center shadow-modal">
                                {props.children}
                            </div>
                        </Transition.Child>
                    </div>
                </Transition>
            </div>
        </Modal>
    );
};

export default GenericDialog;
