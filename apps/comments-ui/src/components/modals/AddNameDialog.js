import React, {useContext, useState, useRef} from 'react';
import {Transition} from '@headlessui/react';
import AppContext from '../../AppContext';

const AddNameDialog = (props) => {
    const inputRef = useRef(null);
    const {dispatchAction} = useContext(AppContext);

    const close = () => {
        dispatchAction('closePopup');
    };

    const submit = async () => {
        if (name.trim() !== '') {
            await dispatchAction('updateMemberName', {
                name
            });
            props.callback();
            close();
        } else {
            setError('Enter your name');
            setName('');
            inputRef.current.focus();
        }
    };

    const [name, setName] = useState('');
    const [error, setError] = useState('');
    return (
        <>
            <h1 className="font-sans font-bold tracking-tight text-[24px] mb-3 text-black">Add context to your comment</h1>
            <p className="font-sans text-[1.45rem] text-neutral-500 px-8 leading-9">For a healthy discussion, let other members know who you are when commenting.</p>
            <section className="mt-8 text-left">
                <div className="flex flex-row mb-2 justify-between">
                    <label htmlFor="comments-name" className="font-sans font-medium text-sm">Name</label>
                    <Transition
                        show={!!error}
                        enter="transition duration-300 ease-out"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition duration-100 ease-out"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="font-sans text-sm text-red-500">{error}</div>
                    </Transition>
                </div>
                <input
                    id="comments-name"
                    className={`transition-[border-color] duration-200 font-sans px-3 rounded border border-neutral-200 focus:border-neutral-300 w-full outline-0 h-[42px] flex items-center ${error && 'border-red-500 focus:border-red-500'}`}
                    type="text"
                    name="name"
                    ref={inputRef}
                    value={name}
                    placeholder="Jamie Larson"
                    autoFocus={true}
                    onChange={(e) => {
                        setName(e.target.value);
                    }}
                    maxLength="64"
                />
                <button
                    className="transition duration-200 ease-linear w-full h-[44px] mt-4 px-8 flex items-center justify-center rounded-md text-white font-sans font-semibold text-[15px] bg-blue-700"
                    onClick={submit}
                >
                    Save
                </button>
            </section>
        </>
    );
};

export default AddNameDialog;
