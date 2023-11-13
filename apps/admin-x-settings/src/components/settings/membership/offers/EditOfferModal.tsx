import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useForm, {ErrorMessages} from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import {Button, Form, PreviewModalContent, TextArea, TextField, showToast} from '@tryghost/admin-x-design-system';
import {Offer, useBrowseOffersById, useEditOffer} from '../../../../api/offers';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {getHomepageUrl} from '../../../../api/site';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const Sidebar: React.FC<{
        clearError: (field: string) => void,
        errors: ErrorMessages,
        offer: Offer, 
        updateOffer: (fields: Partial<Offer>) => void, 
        validate: () => void}> = ({clearError, errors, offer, updateOffer, validate}) => {
            const {siteData} = useGlobalData();      
            const [isCopied, setIsCopied] = useState(false);
            
            const offerUrl = `${getHomepageUrl(siteData!)}${offer?.code}`;
            const handleCopyClick = async () => {
                try {
                    await navigator.clipboard.writeText(offerUrl);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 1000); // reset after 1 seconds
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to copy text: ', err);
                }
            };

            return (
                <div className='pt-7'>
                    <Form>
                        <TextField
                            error={Boolean(errors.name)}
                            hint={errors.name || 'Visible to members on Stripe Checkout page'}
                            placeholder='Black Friday'
                            title='Name'
                            value={offer?.name}
                            onBlur={validate}
                            onChange={e => updateOffer({name: e.target.value})}
                            onKeyDown={() => clearError('name')}
                        />
                        <section className='mt-4'>
                            <h2 className='mb-4 text-lg'>Portal Settings</h2>
                            <div className='flex flex-col gap-6'>
                                <TextField
                                    placeholder='Black Friday Special'
                                    title='Display title'
                                    value={offer?.display_title}
                                    onChange={e => updateOffer({display_title: e.target.value})}
                                />
                                <TextField
                                    error={Boolean(errors.code)}
                                    hint={errors.code}
                                    placeholder='black-friday'
                                    title='Offer code'
                                    value={offer?.code}
                                    onBlur={validate}
                                    onChange={e => updateOffer({code: e.target.value})}
                                    onKeyDown={() => clearError('name')}
                                />
                                <TextArea
                                    placeholder='Take advantage of this limited-time offer.'
                                    title='Display description'
                                    value={offer?.display_description}
                                    onChange={e => updateOffer({display_description: e.target.value})}
                                />
                                <div className='flex flex-col gap-1.5'>
                                    <TextField
                                        disabled={Boolean(true)}
                                        placeholder='https://www.example.com'
                                        title='URL'
                                        type='url'
                                        value={offerUrl}
                                    />
                                    <Button color={isCopied ? 'green' : 'black'} label={isCopied ? 'Copied!' : 'Copy code'} onClick={handleCopyClick} />
                                </div>
                            </div>
                        </section>
                    </Form>
                </div>
            );
        };

const EditOfferModal: React.FC<RoutingModalProps> = ({params}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();
    const hasOffers = useFeatureFlag('adminXOffers');
    const {mutateAsync: editOffer} = useEditOffer();

    useEffect(() => {
        if (!hasOffers) {
            modal.remove();
            updateRoute('');
        }
    }, [hasOffers, modal, updateRoute]);

    const {data: {offers: offerById = []} = {}} = useBrowseOffersById(params?.id ? params?.id : '');

    const {formState, saveState, updateForm, setFormState, handleSave, validate, errors, clearError, okProps} = useForm({
        initialState: offerById[0],
        savingDelay: 500,
        onSave: async () => {
            await editOffer(formState);
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState?.name) {
                newErrors.name = 'Please enter a name';
            }

            if (!formState?.code) {
                newErrors.code = 'Please enter a code';
            }

            return newErrors;
        }
    });

    useEffect(() => {
        setFormState(() => offerById[0]);
    }, [setFormState, offerById[0]]);

    const updateOffer = (fields: Partial<Offer>) => {
        updateForm(state => ({...state, ...fields}));
    };

    const sidebar = <Sidebar
        clearError={clearError}
        errors={errors}
        offer={formState}
        updateOffer={updateOffer}
        validate={validate}
    />;

    return offerById ? <PreviewModalContent deviceSelector={false}
        dirty={saveState === 'unsaved'}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        sidebar={sidebar}
        size='full'
        testId='offer-update-modal'
        title='Offer'
        onCancel={() => {
            modal.remove();
            updateRoute('offers/edit');
        }}
        onOk={async () => {
            if (!(await handleSave({fakeWhenUnchanged: true}))) {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save offer, please double check that you\'ve filled all mandatory fields.'
                });
            }
        }} /> : null;
};

export default NiceModal.create(EditOfferModal);
