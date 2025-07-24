import AliAbdaal from '../../../../assets/images/ali-abdaal.png';
import IsaacSaul from '../../../../assets/images/isaac-saul.png';
import JoelWarner from '../../../../assets/images/joel-warner.png';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {Avatar, Button, Form, Modal, Select, TextArea, showToast} from '@tryghost/admin-x-design-system';
import {generateAvatarColor, getInitials} from '../../../../utils/helpers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface FormState {
    content: string;
    prev_platform: string;
}

const TestimonialsModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const handleError = useHandleError();
    const modal = useModal();
    const {settings, currentUser, siteData, config} = useGlobalData();

    const exploreTestimonialsUrl = config.exploreTestimonialsUrl as string;

    const siteUuid = siteData.site_uuid;
    const [siteTitle] = getSettingValues<string>(settings, ['title']);
    const staffUserName = currentUser.name;
    const staffUserEmail = currentUser.email;
    const staffUserRole = currentUser.roles[0].name;
    const staffUserProfileImage = currentUser.profile_image;

    const {formState, updateForm, saveState, handleSave, errors, clearError} = useForm<FormState>({
        initialState: {
            content: '',
            prev_platform: ''
        },
        onSave: async (): Promise<void> => {
            const prevPlatform = ['none', 'other', ''].includes(formState.prev_platform) ? undefined : formState.prev_platform;
            const payload = {
                ghost_uuid: siteUuid,
                staff_user_email: staffUserEmail,
                content: formState.content,
                prev_platform: prevPlatform
            };

            if (!exploreTestimonialsUrl) {
                throw new Error('Something went wrong, please try again later.');
            }

            const response = await fetch(exploreTestimonialsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Something went wrong, please try again later.');
            }

            showToast({
                message: 'Thank you for your testimonial!',
                type: 'success'
            });

            updateRoute('explore');
            modal.remove();
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.content.trim()) {
                newErrors.content = 'This field is required';
            }

            return newErrors;
        }
    });

    const migratedFromOptions: Array<{value: string; label: string;}> = [
        {value: 'none', label: 'None - This is a new site'},
        {value: 'substack', label: 'Substack'},
        {value: 'beehiiv', label: 'Beehiiv'},
        {value: 'wordpress', label: 'Wordpress'},
        {value: 'newspack', label: 'Newspack'},
        {value: 'medium', label: 'Medium'},
        {value: 'squarespace', label: 'Squarespace'},
        {value: 'memberful', label: 'Memberful'},
        {value: 'other', label: 'Other'}
    ];

    return (
        <Modal
            afterClose={() => {
                updateRoute('explore');
            }}
            cancelLabel=''
            footer={false}
            padding={false}
            testId='explore-testimonials-modal'
            title=''
            topRightContent='close'
            width={920}
        >
            <Form className='!mb-0'>
                <div className='flex items-stretch'>
                    <div className='hidden w-full flex-col justify-between bg-gradient-to-tl from-grey-100/50 to-grey-100/80 p-8 dark:from-grey-900/40 dark:to-grey-900/60 [@media(min-width:905px)]:!visible [@media(min-width:905px)]:!flex'>
                        <div className='pr-6'>
                            <div className='relative rounded-xl bg-white px-3 py-2.5 italic text-grey-700 shadow-lg before:absolute before:-bottom-1.5 before:left-5 before:block before:size-3 before:rotate-45 before:bg-white dark:bg-black dark:text-grey-300 before:dark:bg-black'>
                                Moving to Ghost has proven to be one of the best business decisions we’ve made as an independent media outlet.
                            </div>
                            <div className='ml-2 mt-[14px] flex items-center gap-2 text-sm'>
                                <div className='size-9 rounded-full bg-white bg-cover bg-center opacity-90 grayscale' style={{
                                    backgroundImage: `url(${JoelWarner})`
                                }}></div>
                                <div>
                                    <div className='font-medium text-black dark:text-white'>Joel Warner</div>
                                    <div className='-mt-0.5 text-grey-700'>Lever News</div>
                                </div>
                            </div>
                        </div>

                        <div className='ml-6 mt-8'>
                            <div className='relative rounded-xl bg-white px-3 py-2.5 italic text-grey-700 shadow-lg before:absolute before:-bottom-1.5 before:right-5 before:block before:size-3 before:rotate-45 before:bg-white dark:bg-black dark:text-grey-300 before:dark:bg-black'>
                                It has now been one year since I quit my full-time job to go all in on Tangle. Today, we have 50,000+ paying subscribers. That’s roughly $5M in gross yearly revenue ... it’s the best paying job I’ve ever had.
                            </div>
                            <div className='mr-2 mt-[14px] flex items-center justify-end gap-2 text-sm'>
                                <div className='flex flex-col items-end'>
                                    <div className='font-medium text-black dark:text-white'>Isaac Saul</div>
                                    <div className='-mt-0.5 text-grey-700'>Tangle</div>
                                </div>
                                <div className='size-9 rounded-full bg-white bg-cover bg-center opacity-90 grayscale' style={{
                                    backgroundImage: `url(${IsaacSaul})`
                                }}></div>
                            </div>
                        </div>

                        <div className='mt-8 hidden pr-6 [@media(min-width:940px)]:!visible [@media(min-width:940px)]:!block'>
                            <div className='relative rounded-xl bg-white px-3 py-2.5 italic text-grey-700 shadow-lg before:absolute before:-bottom-1.5 before:left-5 before:block before:size-3 before:rotate-45 before:bg-white dark:bg-black dark:text-grey-300 before:dark:bg-black'>
                                You should be using Ghost because it’s absolutely amazing and I love it. It’s what I’ve been using for all my sites since 2016.
                            </div>
                            <div className='ml-2 mt-[14px] flex items-center gap-2 text-sm'>
                                <div className='size-9 rounded-full bg-white bg-cover bg-center opacity-90 grayscale' style={{
                                    backgroundImage: `url(${AliAbdaal})`
                                }}></div>
                                <div>
                                    <div className='font-medium text-black dark:text-white'>Ali Abdaal</div>
                                    <div className='-mt-0.5 text-grey-700'>YouTuber</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='flex grow flex-col justify-between gap-6 p-8 [@media(min-width:905px)]:min-w-[520px] [@media(min-width:940px)]:min-w-[460px]'>
                        <div>
                            <div className='flex size-[60px] items-center justify-center rounded-full bg-gradient-to-t from-[#CFB0FF] to-[#B27EFF]'>
                                <svg fill="none" height="26" viewBox="0 0 32 26" width="32" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19.9967 26L18.1562 21.4542C23.4268 19.1176 25.7693 16.5261 26.2712 11.7255C25.5183 12.3627 24.5562 12.7026 23.3431 12.7026C20.1641 12.7026 17.4869 10.1536 17.4869 6.41503C17.4869 2.80392 20.3732 9.72736e-07 24.2634 6.32644e-07C28.2791 2.81581e-07 31.5 3.10131 31.5 8.96405C31.5 17.5458 27.4425 23.0261 19.9967 26ZM3.0098 26L1.12745 21.4543C6.43987 19.1176 8.78235 16.5261 9.24248 11.7255C8.53137 12.3627 7.56928 12.7026 6.35621 12.7026C3.17712 12.7026 0.499999 10.1536 0.499998 6.41504C0.499998 2.80393 3.38627 2.45778e-06 7.23464 2.12135e-06C11.2503 1.77028e-06 14.5131 3.10131 14.5131 8.96405C14.5131 17.5458 10.4556 23.0261 3.0098 26Z" fill="white"/>
                                </svg>
                            </div>
                            <div className='mt-6'>
                                <div className='text-2xl font-semibold tracking-tight'>A quote about Ghost</div>
                                <div className='mt-2 text-pretty'>
                                We feature quotes from publishers  to showcase their work, including a logo and a link! If you&apos;d like to be included, share a quote we can use to highlight you.
                                </div>
                            </div>
                            <div className='mt-8'>
                                <TextArea
                                    error={Boolean(errors.content)}
                                    hint={errors.content}
                                    placeholder='What changed for the better since you switched to Ghost?'
                                    rows={7}
                                    value={formState.content}
                                    autoFocus
                                    onChange={e => updateForm(state => ({...state, content: e.target.value}))}
                                    onKeyDown={() => clearError('content')}
                                />
                            </div>
                            <div className='ml-0.5 mt-4'>
                                <div className='flex items-center gap-2'>
                                    <Avatar bgColor={generateAvatarColor((staffUserName ? staffUserName : staffUserEmail))} image={staffUserProfileImage ?? undefined} label={getInitials(staffUserName)} labelColor='white' size='md' />
                                    <div className='flex flex-col'>
                                        <span className='text-sm font-medium'>By {staffUserName ? staffUserName : staffUserEmail}</span>
                                        <span className='text-xs text-grey-700'>{staffUserRole} — {siteTitle}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className='mt-2 flex items-center gap-4'>
                                <div className='grow'>
                                    <Select
                                        error={Boolean(errors.prev_platform)}
                                        hint={errors.prev_platform}
                                        options={migratedFromOptions}
                                        placeholder='Previous platform'
                                        selectedOption={migratedFromOptions.find(option => option.value === formState.prev_platform)}
                                        testId='migrated-from'
                                        onSelect={(option) => {
                                            updateForm(state => ({...state, prev_platform: option?.value || ''}));
                                            clearError('prev_platform');
                                        }}
                                    />
                                </div>
                                <Button
                                    className='!h-[38px] rounded-lg'
                                    color="black"
                                    disabled={saveState === 'saving'}
                                    label="Send testimonial"
                                    loading={saveState === 'saving'}
                                    onClick={async () => {
                                        await handleSave();
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Form>
        </Modal>
    );
});

export default TestimonialsModal;
