import React, {useContext, useState, useRef, useEffect} from 'react';
import {Transition} from '@headlessui/react';
import CloseButton from './CloseButton';
import AppContext from '../../AppContext';

const AddNameDialog = (props) => {
    const inputNameRef = useRef(null);
    const inputBioRef = useRef(null);
    const {dispatchAction, member} = useContext(AppContext);

    const [name, setName] = useState(member.name ?? '');
    const [bio, setBio] = useState(member.bio ?? '');

    const [exampleProfiles, setExampleProfiles] = useState([]);
    const [exampleExpertise, setExampleExpertise] = useState('Head of Marketing');

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

    const generateExampleProfiles = () => {
        let returnable = [];
        let dummyData = [
            {avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2670&q=80', name: 'Sophie Joan', expertise: 'Freelance Writer'},
            {avatar: 'https://images.unsplash.com/photo-1569913486515-b74bf7751574?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1289&q=80', name: 'Naomi Schiff', expertise: 'Founder @ Acme Inc'},
            {avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2667&q=80', name: 'Katrina Klosp', expertise: 'Local Resident'},
            {avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1361&q=80', name: 'Laura Smith', expertise: 'Craft Maker'},
            {avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1760&q=80', name: 'Peter Kristy', expertise: 'Design Consultant'},
            {avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1364&q=80', name: 'Linda Lo', expertise: 'Wedding Photographer'},
            {avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1760&q=80', name: 'Darren Mckenzie', expertise: 'Senior Engineer'},
            {avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1287&q=80', name: 'Jack Tomlin', expertise: 'Mid-level UX Designer'}
        ];

        // setup fake users
        for (let i = 0; i < 4; i++) {
            let dummyIndex = Math.floor(Math.random() * dummyData.length);
            returnable.push(dummyData[dummyIndex]);
            dummyData.splice(dummyIndex, 1);
        }

        return returnable;
    };

    const generateExampleExpertise = () => {
        let dummyData = [
            'Freelance Copywriter',
            'Head of Marketing',
            'Junior Developer',
            'Full-time Parent',
            'Local Resident',
            'English Teacher',
            'Support Officer',
            'Professional Athlete'
        ];

        return dummyData[Math.floor(Math.random() * dummyData.length)];
    };

    // using <input autofocus> breaks transitions in browsers. So we need to use a timer
    useEffect(() => {
        setExampleProfiles(generateExampleProfiles());
        setExampleExpertise(generateExampleExpertise());

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

    const renderExampleProfile = (index) => {
        return (exampleProfiles[index] ? 
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
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-no-repeat bg-cover" style={{backgroundImage: `url(${exampleProfiles[index].avatar})`}} />
                    <div className="flex flex-col justify-center items-start">
                        <div className="text-base font-sans font-semibold tracking-tight text-white">
                            {exampleProfiles[index].name}
                        </div>
                        <div className="font-sans text-[14px] tracking-tight text-neutral-400">
                            {exampleProfiles[index].expertise}
                        </div>
                    </div>
                </div>
            </Transition> : null
        );
    };

    return (
        <div className="overflow-hidden relative bg-white w-screen sm:w-[720px] h-screen sm:h-auto p-[28px] sm:p-0 rounded-none sm:rounded-xl text-center shadow-modal" onClick={stopPropagation}>
            <div className="flex">
                <div className="flex flex-col justify-center items-center w-[40%] bg-[#1C1C1C]">
                    <div className="flex flex-col">
                        {exampleProfiles.length > 0 && (
                            <>
                                <span>{renderExampleProfile(0)}</span>
                                <span>{renderExampleProfile(1)}</span>
                                <span>{renderExampleProfile(2)}</span>
                                <span>{renderExampleProfile(3)}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="w-[60%] p-8">
                    <h1 className="font-sans font-bold tracking-tight text-[24px] mb-1 text-black text-left">Complete your profile.</h1>
                    <p className="font-sans text-base text-neutral-500 pr-4 sm:pr-10 leading-9 text-left">Add context to your comment, share your name and expertise to foster a healthy discussion.</p>
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
                            placeholder={exampleExpertise}
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
                            className="transition-opacity duration-200 ease-linear w-full h-[44px] mt-8 px-8 flex items-center justify-center rounded-md text-white font-sans font-semibold text-[15px] bg-[#3204F5] opacity-100 hover:opacity-90"
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
