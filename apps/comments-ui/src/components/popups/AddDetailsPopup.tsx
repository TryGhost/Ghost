import CloseButton from './CloseButton';
import reactStringReplace from 'react-string-replace';
import {Transition} from '@headlessui/react';
import {isMobile} from '../../utils/helpers';
import {useAppContext} from '../../AppContext';
import {useEffect, useRef, useState} from 'react';

type Props = {
    callback: (succeeded: boolean) => void,
    expertiseAutofocus?: boolean
};
const AddDetailsPopup = (props: Props) => {
    const inputNameRef = useRef<HTMLInputElement>(null);
    const inputExpertiseRef = useRef<HTMLInputElement>(null);
    const {dispatchAction, member, accentColor, t} = useAppContext();

    const [name, setName] = useState(member.name ?? '');
    const [expertise, setExpertise] = useState(member.expertise ?? '');

    const maxExpertiseChars = 50;
    let initialExpertiseChars = maxExpertiseChars;
    if (member.expertise) {
        initialExpertiseChars -= member.expertise.length;
    }
    const [expertiseCharsLeft, setExpertiseCharsLeft] = useState(initialExpertiseChars);

    const [error, setError] = useState({name: '', expertise: ''});

    const stopPropagation = (event: Event) => {
        event.stopPropagation();
    };

    const close = (succeeded: boolean) => {
        dispatchAction('closePopup', {});
        props.callback(succeeded);
    };

    const submit = async () => {
        if (name.trim() !== '') {
            await dispatchAction('updateMember', {
                name,
                expertise
            });
            close(true);
        } else {
            setError({name: t('Enter your name'), expertise: ''});
            setName('');
            inputNameRef.current?.focus();
        }
    };

    // using <input autofocus> breaks transitions in browsers. So we need to use a timer
    useEffect(() => {
        if (!isMobile()) {
            const timer = setTimeout(() => {
                if (props.expertiseAutofocus) {
                    inputExpertiseRef.current?.focus();
                } else {
                    inputNameRef.current?.focus();
                }
            }, 200);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [inputNameRef, inputExpertiseRef, props.expertiseAutofocus]);

    const renderExampleProfiles = () => {
        const renderEl = (profile: {name: string, avatar: string, expertise: string}) => {
            return (
                <Transition
                    key={profile.name}
                    enter={`transition duration-200 delay-[400ms] ease-out`}
                    enterFrom="opacity-0 translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition duration-200 ease-in"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-2"
                    appear
                >
                    <div className="flex flex-row items-center justify-start gap-3 pr-4">
                        <div className="h-10 w-10 rounded-full border-2 border-white bg-cover bg-no-repeat" style={{backgroundImage: `url(${profile.avatar})`}} />
                        <div className="flex flex-col items-start justify-center">
                            <div className="font-sans text-base font-semibold tracking-tight text-white">
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

        const returnable = [];

        // using URLS over real images for avatars as serving JPG images was not optimal (based on discussion with team)
        const exampleProfiles = [
            {avatar: 'https://randomuser.me/api/portraits/men/32.jpg', name: 'James Fletcher', expertise: t('Full-time parent')},
            {avatar: 'https://randomuser.me/api/portraits/women/30.jpg', name: 'Naomi Schiff', expertise: t('Founder @ Acme Inc')},
            {avatar: 'https://randomuser.me/api/portraits/men/4.jpg', name: 'Franz Tost', expertise: t('Neurosurgeon')},
            {avatar: 'https://randomuser.me/api/portraits/women/51.jpg', name: 'Katrina Klosp', expertise: t('Local resident')}
        ];

        for (let i = 0; i < exampleProfiles.length; i++) {
            returnable.push(renderEl(exampleProfiles[i]));
        }

        return returnable;
    };

    const charsText = reactStringReplace(t('{{amount}} characters left'), '{{amount}}', () => {
        return <b>{expertiseCharsLeft}</b>;
    });

    return (
        <div className="shadow-modal relative h-screen w-screen overflow-hidden rounded-none bg-white p-[28px] text-center sm:h-auto sm:w-[720px] sm:rounded-xl sm:p-0" data-testid="profile-modal" onMouseDown={stopPropagation}>
            <div className="flex">
                <div className={`hidden w-[50%] flex-col items-center justify-center bg-[#1C1C1C] sm:block sm:p-8`}>
                    <div className="mt-[-1px] flex flex-col gap-9 text-left">
                        {renderExampleProfiles()}
                    </div>
                </div>
                <div className={`p-0 sm:p-8`}>
                    <h1 className="mb-1 text-center font-sans text-[24px] font-bold tracking-tight text-black sm:text-left">{t('Complete your profile')}<span className="hidden sm:inline">.</span></h1>
                    <p className="pr-0 text-center font-sans text-base leading-9 text-neutral-500 sm:pr-10 sm:text-left">{t('Add context to your comment, share your name and expertise to foster a healthy discussion.')}</p>
                    <section className="mt-8 text-left">
                        <div className="mb-2 flex flex-row justify-between">
                            <label className="font-sans text-[1.3rem] font-semibold" htmlFor="comments-name">{t('Name')}</label>
                            <Transition
                                enter="transition duration-300 ease-out"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="transition duration-100 ease-out"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                                show={!!error.name}
                            >
                                <div className="font-sans text-sm text-red-500">{error.name}</div>
                            </Transition>
                        </div>
                        <input
                            ref={inputNameRef}
                            className={`flex h-[42px] w-full items-center rounded border border-neutral-200 px-3 font-sans text-[16px] outline-0 transition-[border-color] duration-200 focus:border-neutral-300 ${error.name && 'border-red-500 focus:border-red-500'}`}
                            data-testid="name-input"
                            id="comments-name"
                            maxLength={64}
                            name="name"
                            placeholder={t('Jamie Larson')}
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.currentTarget.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setName(e.currentTarget.value);
                                    // eslint-disable-next-line no-console
                                    submit().catch(console.error);
                                }
                            }}
                        />
                        <div className="mb-2 mt-6 flex flex-row justify-between">
                            <label className="font-sans text-[1.3rem] font-semibold" htmlFor="comments-name">{t('Expertise')}</label>
                            <div className={`font-sans text-[1.3rem] text-neutral-400 ${(expertiseCharsLeft === 0) && 'text-red-500'}`}>{charsText}</div>
                        </div>
                        <input
                            ref={inputExpertiseRef}
                            className={`flex h-[42px] w-full items-center rounded border border-neutral-200 px-3 font-sans text-[16px] outline-0 transition-[border-color] duration-200 focus:border-neutral-300 ${(expertiseCharsLeft === 0) && 'border-red-500 focus:border-red-500'}`}
                            data-testid="expertise-input"
                            id="comments-expertise"
                            maxLength={maxExpertiseChars}
                            name="expertise"
                            placeholder={t('Head of Marketing at Acme, Inc')}
                            type="text"
                            value={expertise}
                            onChange={(e) => {
                                const expertiseText = e.currentTarget.value;
                                setExpertiseCharsLeft(maxExpertiseChars - expertiseText.length);
                                setExpertise(expertiseText);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setExpertise(e.currentTarget.value);
                                    // eslint-disable-next-line no-console
                                    submit().catch(console.error);
                                }
                            }}
                        />
                        <button
                            className={`mt-10 flex h-[42px] w-full items-center justify-center rounded-md px-8 font-sans text-[15px] font-semibold text-white opacity-100 transition-opacity duration-200 ease-linear hover:opacity-90`}
                            data-testid="save-button"
                            style={{backgroundColor: accentColor ?? '#000000'}}
                            type="button"
                            onClick={() => {
                                // eslint-disable-next-line no-console
                                submit().catch(console.error);
                            }}
                        >
                            {t('Save')}
                        </button>
                    </section>
                </div>
                <CloseButton close={() => close(false)} />
            </div>
        </div>
    );
};

export default AddDetailsPopup;
