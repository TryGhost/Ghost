import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PortalFrame from '../../membership/portal/PortalFrame';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useForm, {ErrorMessages} from '../../../../hooks/useForm';
import {Button, ConfirmationModal, Form, PreviewModalContent, TextArea, TextField, showToast} from '@tryghost/admin-x-design-system';
import {Offer, useBrowseOffersById, useEditOffer} from '@tryghost/admin-x-framework/api/offers';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {getOfferPortalPreviewUrl, offerPortalPreviewUrlTypes} from '../../../../utils/getOffersPortalPreviewUrl';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const Sidebar: React.FC<{
        clearError: (field: string) => void,
        errors: ErrorMessages,
        offer: Offer,
        updateOffer: (fields: Partial<Offer>) => void,
        validate: () => void}> = ({clearError, errors, offer, updateOffer, validate}) => {
            const {siteData} = useGlobalData();
            const [isCopied, setIsCopied] = useState(false);
            const handleError = useHandleError();
            const {mutateAsync: editOffer} = useEditOffer();

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

            const confirmStatusChange = async () => {
                if (offer?.status === 'active') {
                    NiceModal.show(ConfirmationModal, {
                        title: 'Archive offer',
                        prompt: <>
                            <p>New members will no longer be able to subscribe using this offer.</p>
                            <p>All members that previously redeemed <strong>{offer?.name}</strong> will remain unchanged.</p>
                        </>,
                        okLabel: 'Archive',
                        okColor: 'red',
                        onOk: async (modal) => {
                            try {
                                await editOffer({...offer, status: 'archived'});
                                modal?.remove();
                                showToast({
                                    type: 'success',
                                    message: 'Offer archived successfully'
                                });
                            } catch (e) {
                                handleError(e);
                            }
                        }
                    });
                } else {
                    NiceModal.show(ConfirmationModal, {
                        title: 'Reactivate offer',
                        prompt: <>
                            <p>Reactivating <strong>{offer?.name}</strong> will allow new members to subscribe using this offer. Existing members will remain unchanged.</p>
                        </>,
                        okLabel: 'Reactivate',
                        onOk: async (modal) => {
                            try {
                                await editOffer({...offer, status: 'active'});
                                modal?.remove();
                                showToast({
                                    type: 'success',
                                    message: 'Offer reactivated successfully'
                                });
                            } catch (e) {
                                handleError(e);
                            }
                        }
                    });
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
                    <div className='mb-5 mt-10'>
                        {offer?.status === 'active' ? <Button color='red' label='Archive offer' link onClick={confirmStatusChange} /> : <Button color='green' label='Reactivate offer' link onClick={confirmStatusChange} />}
                    </div>
                </div>
            );
        };

const EditOfferModal: React.FC<RoutingModalProps> = ({params}) => {
    const {siteData} = useGlobalData();
    const modal = useModal();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();
    const hasOffers = useFeatureFlag('adminXOffers');
    const {mutateAsync: editOffer} = useEditOffer();

    const [href, setHref] = useState<string>('');

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
    }, [setFormState, offerById]);

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

    // {
    //     "id": "65541d87ac4bfaf85f35e773",
    //     "name": "apples",
    //     "code": "apples",
    //     "display_title": "apples",
    //     "display_description": "A new appple",
    //     "type": "percent",
    //     "cadence": "month",
    //     "amount": 30,
    //     "duration": "forever",
    //     "duration_in_months": null,
    //     "currency_restriction": false,
    //     "currency": null,
    //     "status": "active",
    //     "redemption_count": 0,
    //     "tier": {
    //         "id": "6535e75005fd81e1492d0cca",
    //         "name": "Ronald SQLite Dev"
    //     }
    // }

    useEffect(() => {
        const dataset : offerPortalPreviewUrlTypes = {
            name: formState?.name || '',
            code: {
                value: formState?.code || ''
            },
            displayTitle: {
                value: formState?.display_title || ''
            },
            displayDescription: formState?.display_description || '',
            type: formState?.type || '',
            cadence: formState?.cadence || '',
            trialAmount: formState?.amount,
            discountAmount: formState?.amount,
            duration: formState?.duration || '',
            durationInMonths: formState?.duration_in_months || 0,
            currency: formState?.currency || '',
            status: formState?.status || '',
            tierId: formState?.tier.id || '',
            amountType: formState?.type === 'percent' ? 'percent' : 'amount'
        };
        
        const newHref = getOfferPortalPreviewUrl(dataset, siteData.url);
        setHref(newHref);
    }, [formState, siteData]);

    const iframe = <PortalFrame
        href={href}
    />;

    return offerById ? <PreviewModalContent deviceSelector={false}
        dirty={saveState === 'unsaved'}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        preview={iframe}
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
