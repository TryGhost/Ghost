import React, {useContext, useState, useRef, useEffect} from 'react';
import {Transition} from '@headlessui/react';
import CloseButton from './CloseButton';
import AppContext from '../../AppContext';

const AddNameDialog = (props) => {
    const inputNameRef = useRef(null);
    const inputBioRef = useRef(null);
    const {dispatchAction, member, accentColor} = useContext(AppContext);

    const [name, setName] = useState(member.name ?? '');
    const [bio, setBio] = useState(member.bio ?? '');

    const maxBioChars = 50;
    let initialBioChars = maxBioChars;
    if (member.bio) {
        initialBioChars -= member.bio.length;
    }
    const [bioCharsLeft, setBioCharsLeft] = useState(initialBioChars);

    const [error, setError] = useState({name: '', bio: ''});

    const stopPropagation = (event) => {
        event.stopPropagation();
    };

    const close = (succeeded) => {
        dispatchAction('closePopup');
        props.callback(succeeded);
    };

    const submit = async () => {
        if (name.trim() !== '') {
            await dispatchAction('updateMember', {
                name,
                bio
            });
            close(true);
        } else {
            setError({name: 'Enter your name'});
            setName('');
            inputNameRef.current?.focus();
        }
    };

    // using <input autofocus> breaks transitions in browsers. So we need to use a timer
    useEffect(() => {
        const timer = setTimeout(() => {
            if (props.bioAutofocus) {
                inputBioRef.current?.focus();
            } else {
                inputNameRef.current?.focus();
            }  
        }, 200);

        return () => {
            clearTimeout(timer);
        };
    }, [inputNameRef, inputBioRef]);

    const renderExampleProfiles = (index) => {
        const renderEl = (profile) => {
            return (
                <Transition
                    appear
                    enter={`transition duration-200 delay-[400ms] ease-out`}
                    enterFrom="opacity-0 translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition duration-200 ease-in"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-2"
                >
                    <div className="flex flex-row justify-start items-center gap-3 my-4 pr-4">
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-no-repeat bg-cover" style={{backgroundImage: `url(${profile.avatar})`}} />
                        <div className="flex flex-col justify-center items-start">
                            <div className="text-base font-sans font-semibold tracking-tight text-white">
                                {profile.name}
                            </div>
                            <div className="font-sans text-[14px] tracking-tight text-neutral-400">
                                {profile.expertise}
                            </div>
                        </div>
                    </div>
                </Transition> 
            );
        };

        let returnable = [];

        // using URLS over real images for avatars as serving JPG images was not optimal (based on discussion with team)
        let exampleProfiles = [
            {avatar: 'https://randomuser.me/api/portraits/men/32.jpg', name: 'James Fletcher', expertise: 'Full-time parent'},
            {avatar: 'https://randomuser.me/api/portraits/women/30.jpg', name: 'Naomi Schiff', expertise: 'Founder @ Acme Inc'},
            {avatar: 'https://randomuser.me/api/portraits/men/4.jpg', name: 'Franz Tost', expertise: 'Neurosurgeon'},
            {avatar: 'https://randomuser.me/api/portraits/women/51.jpg', name: 'Katrina Klosp', expertise: 'Local resident'}
        ];

        for (let i = 0; i < exampleProfiles.length; i++) {
            returnable.push(renderEl(exampleProfiles[i]));
        }

        return returnable;
    };

    return (
        <div className="overflow-hidden relative bg-white w-screen sm:w-[720px] h-screen sm:h-auto p-[28px] sm:p-0 rounded-none sm:rounded-xl text-center shadow-modal" onClick={stopPropagation}>
            <div className="flex">
                <div className="hidden sm:flex sm:flex-col sm:justify-center sm:items-center sm:w-[40%] bg-[#1C1C1C]">
                    <div className="flex flex-col">
                        {renderExampleProfiles()}
                    </div>
                </div>
                <div className="w-[100%] sm:w-[60%] p-0 sm:p-8">
                    <h1 className="font-sans font-bold tracking-tight text-[24px] mb-1 text-black text-center sm:text-left">Complete your profile<span className="hidden sm:inline">.</span></h1>
                    <p className="font-sans text-base text-neutral-500 pr-0 sm:pr-10 leading-9 text-center sm:text-left">Add context to your comment, share your name and expertise to foster a healthy discussion.</p>
                    <section className="mt-8 text-left">
                        <div className="flex flex-row mb-2 justify-between">
                            <label htmlFor="comments-name" className="font-sans font-medium text-sm">Name</label>
                            <Transition
                                show={!!error.name}
                                enter="transition duration-300 ease-out"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="transition duration-100 ease-out"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div className="font-sans text-sm text-red-500">{error.name}</div>
                            </Transition>
                        </div>
                        <input
                            id="comments-name"
                            className={`transition-[border-color] duration-200 font-sans px-3 rounded border border-neutral-200 focus:border-neutral-300 w-full outline-0 h-[42px] flex items-center ${error.name && 'border-red-500 focus:border-red-500'}`}
                            type="text"
                            name="name"
                            ref={inputNameRef}
                            value={name}
                            placeholder="Jamie Larson"
                            onChange={(e) => {
                                setName(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setName(e.target.value);
                                    submit();
                                }
                            }}
                            maxLength="64"
                        />
                        <div className="flex flex-row mt-6 mb-2 justify-between">
                            <label htmlFor="comments-name" className="font-sans font-medium text-sm">Expertise</label>
                            <div className={`font-sans text-sm text-neutral-400 ${(bioCharsLeft === 0) && 'text-red-500'}`}><b>{bioCharsLeft}</b> characters left</div>
                        </div>
                        <input
                            id="comments-bio"
                            className={`transition-[border-color] duration-200 font-sans px-3 rounded border border-neutral-200 focus:border-neutral-300 w-full outline-0 h-[42px] flex items-center ${(bioCharsLeft === 0) && 'border-red-500 focus:border-red-500'}`}
                            type="text"
                            name="bio"
                            ref={inputBioRef}
                            value={bio}
                            placeholder="Head of Marketing at Acme, Inc"
                            onChange={(e) => {
                                let bioText = e.target.value;
                                setBioCharsLeft(maxBioChars - bioText.length);
                                setBio(bioText);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setBio(e.target.value);
                                    submit();
                                }
                            }}
                            maxLength={maxBioChars}
                        />
                        <button
                            className={`transition-opacity duration-200 ease-linear w-full h-[44px] mt-8 px-8 flex items-center justify-center rounded-md text-white font-sans font-semibold text-[15px] opacity-100 hover:opacity-90`}
                            style={{backgroundColor: accentColor ?? '#000000'}}
                            onClick={submit}
                        >
                            Save
                        </button>
                    </section>
                </div>
                <CloseButton close={() => close(false)} />
            </div>
        </div>
    );
};

export default AddNameDialog;
