import NiceModal from '@ebay/nice-modal-react';
import PortalFrame from '../../membership/portal/portal-frame';
import toast from 'react-hot-toast';
import {Button, ConfirmationModal, Form, PreviewModalContent, TextArea, TextField, showToast} from '@tryghost/admin-x-design-system';
import {type ErrorMessages, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {type Offer, useBrowseOffersById, useEditOffer} from '@tryghost/admin-x-framework/api/offers';
import {createRedemptionFilterUrl} from './offers-index';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {getOfferPortalPreviewUrl, type offerPortalPreviewUrlTypes} from '../../../../utils/get-offers-portal-preview-url';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('default', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
}

const Sidebar: React.FC<{
        clearError: (field: string) => void,
        errors: ErrorMessages,
        offer: Offer,
        updateOffer: (fields: Partial<Offer>) => void,
        validate: () => void}> = ({clearError, errors, offer, updateOffer}) => {
            const {siteData} = useGlobalData();
            const [isCopied, setIsCopied] = useState(false);
            const handleError = useHandleError();
            const {mutateAsync: editOffer} = useEditOffer();

            const [nameLength, setNameLength] = useState(offer?.name.length || 0);
            const nameLengthColor = nameLength > 40 ? 'text-red' : 'text-green';

            const {updateRoute} = useRouting();

            useEffect(() => {
                if (offer?.name) {
                    setNameLength(offer?.name.length);
                }
            }, [offer?.name]);

            const homepageUrl = getHomepageUrl(siteData!);
            const offerUrl = `${homepageUrl}${offer?.code}`;
            const handleCopyClick = async () => {
                await navigator.clipboard.writeText(offerUrl);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
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
                                    title: 'Offer archived'
                                });
                                updateRoute('offers/edit');
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
                                    title: 'Offer reactivated'
                                });
                                updateRoute('offers/edit');
                            } catch (e) {
                                handleError(e);
                            }
                        }
                    });
                }
            };

            return (
                <div className='flex grow flex-col pt-2'>
                    <Form className=' grow'>
                        <section>
                            <div className='flex flex-col gap-5 rounded-md border border-grey-300 p-4 pb-3.5 dark:border-grey-800'>
                                <div className='flex flex-col gap-1.5'>
                                    <span className='text-xs font-semibold leading-none text-grey-700'>Created on</span>
                                    <span>{formatTimestamp(offer?.created_at ? offer.created_at : '')}</span>
                                </div>
                                <div className='flex items-end justify-between'>
                                    <div className='flex flex-col gap-5'>
                                        <div className='flex flex-col gap-1.5'>
                                            <span className='text-xs font-semibold leading-none text-grey-700'>Performance</span>
                                            <span>{offer?.redemption_count} {offer?.redemption_count === 1 ? 'redemption' : 'redemptions'}</span>
                                        </div>
                                        {offer?.redemption_count > 0 && offer?.last_redeemed ?
                                            <div className='flex flex-col gap-1.5'>
                                                <span className='text-xs font-semibold leading-none text-grey-700'>Last redemption</span>
                                                <span>{formatTimestamp(offer?.last_redeemed)}</span>
                                            </div> :
                                            null
                                        }
                                    </div>
                                    {offer?.redemption_count > 0 ? <a className='font-semibold text-green' href={createRedemptionFilterUrl(offer?.id)}>See members →</a> : null}
                                </div>
                            </div>
                        </section>
                        <section className='mt-2'>
                            <h2 className='mb-4 text-lg'>General</h2>
                            <div className='flex flex-col gap-6'>
                                <TextField
                                    error={Boolean(errors.name)}
                                    hint={errors.name || <div className='flex justify-between'><span>Visible to members on Stripe Checkout page</span><strong><span className={`${nameLengthColor}`}>{nameLength}</span> / 40</strong></div>}
                                    maxLength={40}
                                    placeholder='Black Friday'
                                    title='Offer name'
                                    value={offer?.name}
                                    onChange={(e) => {
                                        setNameLength(e.target.value.length);
                                        updateOffer({name: e.target.value});
                                    }}
                                    onKeyDown={() => clearError('name')}
                                />
                                <TextField
                                    containerClassName='group'
                                    error={Boolean(errors.code)}
                                    hint={errors.code || (offer?.code !== '' ? <span className='truncate text-grey-700'>{homepageUrl}<span className='font-bold text-black dark:text-white'>{offer?.code}</span></span> : null)}
                                    placeholder='black-friday'
                                    rightPlaceholder={offer?.code !== '' ? <Button className='mr-0.5 mt-1' color='green' label={isCopied ? 'Copied!' : 'Copy link'} size='sm' onClick={handleCopyClick} /> : null}
                                    title='Offer code'
                                    value={offer?.code}
                                    onChange={e => updateOffer({code: e.target.value})}
                                    onKeyDown={() => clearError('code')}
                                />
                                <TextField
                                    error={Boolean(errors.displayTitle)}
                                    hint={errors.displayTitle}
                                    placeholder='Black Friday Special'
                                    title='Display title'
                                    value={offer?.display_title}
                                    onChange={e => updateOffer({display_title: e.target.value})}
                                    onKeyDown={() => clearError('displayTitle')}
                                />
                                <TextArea
                                    placeholder='Take advantage of this limited-time offer.'
                                    title='Display description'
                                    value={offer?.display_description}
                                    onChange={e => updateOffer({display_description: e.target.value})}
                                />
                            </div>
                        </section>
                    </Form>
                    <div className='mb-2'>
                        {offer?.status === 'active' ? <Button color='red' label='Archive offer' link onClick={confirmStatusChange} /> : <Button color='green' label='Reactivate offer' link onClick={confirmStatusChange} />}
                    </div>
                </div>
            );
        };

const EditOfferModal: React.FC<{id: string}> = ({id}) => {
    const {siteData} = useGlobalData();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();
    const {mutateAsync: editOffer} = useEditOffer();

    const [href, setHref] = useState<string>('');

    const {data: {offers: offerById = []} = {}} = useBrowseOffersById(id ? id : '');

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
                newErrors.name = 'Name is required';
            }

            if (!formState?.display_title) {
                newErrors.displayTitle = 'Display title is required';
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

    useEffect(() => {
        const dataset : offerPortalPreviewUrlTypes = {
            name: formState?.name || '',
            code: formState?.code || '',
            displayTitle: formState?.display_title || '',
            displayDescription: formState?.display_description || '',
            type: formState?.type || '',
            cadence: formState?.cadence || '',
            amount: formState?.amount,
            duration: formState?.duration || '',
            durationInMonths: formState?.duration_in_months || 0,
            currency: formState?.currency || '',
            status: formState?.status || '',
            tierId: formState?.tier?.id || '',
            redemptionType: 'signup'
        };

        const newHref = getOfferPortalPreviewUrl(dataset, siteData.url);
        setHref(newHref);
    }, [formState, siteData]);

    const iframe = <PortalFrame
        href={href || ''}
        portalParent='offers'
    />;

    const goBack = () => {
        if (sessionStorage.getItem('editOfferPageSource') === 'offers') {
            sessionStorage.removeItem('editOfferPageSource');
            updateRoute('offers');
        } else {
            sessionStorage.removeItem('editOfferPageSource');
            updateRoute('offers/edit');
        }
    };

    return offerById ? <PreviewModalContent
        afterClose={() => {
            updateRoute('offers');
        }}
        backDropClick={false}
        cancelLabel='Cancel'
        deviceSelector={false}
        dirty={saveState === 'unsaved'}
        height='full'
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        preview={iframe}
        previewToolbarBreadcrumbs={[
            {label: 'Offers', onClick: goBack},
            {label: formState?.name || 'Offer'}
        ]}
        sidebar={sidebar}
        size='lg'
        testId='offer-update-modal'
        title='Offer'
        width={1140}
        onBreadcrumbsBack={goBack}
        onCancel={goBack}
        onOk={async () => {
            try {
                if (await handleSave({force: true})) {
                    return;
                }
            } catch (e) {
                let message;

                if (e instanceof JSONError && e.data && e.data.errors[0]) {
                    message = e.data.errors[0].context || e.data.errors[0].message;
                }

                toast.remove();
                if (message) {
                    showToast({
                        title: 'Can\'t save offer',
                        type: 'error',
                        message: 'Please try again later'
                    });
                }
            }
        }} /> : null;
};

export default EditOfferModal;
