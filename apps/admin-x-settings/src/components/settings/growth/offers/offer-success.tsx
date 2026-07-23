import SettingsBreadcrumbs from '../../settings-breadcrumbs';
import {Button} from '@tryghost/shade/components';
import {Icon} from '@tryghost/admin-x-design-system';
import {Modal} from '@tryghost/admin-x-design-system';
import {type Offer, useBrowseOffersById} from '@tryghost/admin-x-framework/api/offers';
import {TextField} from '@tryghost/admin-x-design-system';
import {currencyToDecimal} from '../../../../utils/currency';
import {formatNumber} from '@tryghost/shade/utils';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const OfferSuccess: React.FC<{id: string}> = ({id}) => {
    const {updateRoute} = useRouting();
    const {data: {offers: offerById = []} = {}} = useBrowseOffersById(id ? id : '');

    const [offer, setOffer] = useState<Offer>();
    const [offerLink, setOfferLink] = useState<string>('');

    const {siteData} = useGlobalData();

    useEffect(() => {
        if (offerById.length > 0) {
            const currentOffer = offerById[0];
            const offerUrl = `${getHomepageUrl(siteData!)}${currentOffer?.code}`;
            setOfferLink(offerUrl);
            setOffer(currentOffer);
        }
    }, [offerById, siteData]);

    const [isCopied, setIsCopied] = useState(false);

    const getShareText = () => {
        let discount = '';

        switch (offer?.type) {
        case 'percent':
            discount = offer?.amount + '% discount';
            break;
        case 'fixed':
            discount = formatNumber(currencyToDecimal(offer?.amount), {maximumFractionDigits: 2}) + ' ' + offer?.currency + ' discount';
            break;
        case 'trial':
            discount = offer?.amount + ' days free trial';
            break;
        default:
            break;
        };

        return `${encodeURIComponent(offer?.name || '')} — Check out ${encodeURIComponent(discount)} on:`;
    };

    const handleCopyClick = async () => {
        await navigator.clipboard.writeText(offerLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURI(offerLink)}&text=${getShareText()}`, '_blank');
    };

    const handleFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURI(offerLink)}`, '_blank');
    };

    const handleLinkedIn = () => {
        window.open(`http://www.linkedin.com/shareArticle?mini=true&url=${encodeURI(offerLink)}&title=${getShareText()}`, '_blank');
    };

    return <Modal
        afterClose={() => {
            updateRoute('offers');
        }}
        animate={false}
        backDropClick={false}
        footer={false}
        height='full'
        size='lg'
        testId='offer-success-modal'
        topRightContent='close'
        width={1140}
    >
        <div className='-mt-6 flex h-full flex-col items-center justify-center text-center'>
            <SettingsBreadcrumbs
                className='absolute top-5 left-6'
                current={offer?.name || ''}
                label='Offers'
                onBack={() => updateRoute('offers/edit')}
            />
            <Icon colorClass='text-grey-700 -mt-4' name='tags-check' size='xl' />
            <h1 className='mt-6 text-4xl'>Your new offer is live!</h1>
            <p className='mt-3 max-w-[510px] text-[1.6rem]'>You can share the link anywhere. In your newsletter, social media, a podcast, or in-person. It all just works.</p>
            <div className='mt-8 flex w-full max-w-md flex-col gap-8'>
                <div className='flex flex-col-reverse gap-2'>
                    <TextField name='offer-url' type='url' value={offerLink} disabled />
                    <Button className='w-full' type='button' onClick={handleCopyClick}>{isCopied ? 'Copied!' : 'Copy link'}</Button>
                </div>
                <div className='flex items-center gap-4 text-sm font-medium before:h-px before:grow before:bg-grey-300 before:content-[""] after:h-px after:grow after:bg-grey-300 after:content-[""] dark:before:bg-grey-800 dark:after:bg-grey-800'>OR</div>
                <div className='flex gap-2'>
                    <Button aria-label='Share on X' className='h-8 flex-1' size='sm' type='button' variant='outline' onClick={handleTwitter}><Icon className='size-3.5!' name='twitter-x' /></Button>
                    <Button aria-label='Share on Facebook' className='h-8 flex-1' size='sm' type='button' variant='outline' onClick={handleFacebook}><Icon name='facebook' size='sm' /></Button>
                    <Button aria-label='Share on LinkedIn' className='h-8 flex-1' size='sm' type='button' variant='outline' onClick={handleLinkedIn}><Icon name='linkedin' size='sm' /></Button>
                </div>
            </div>
        </div>
    </Modal>;
};

export default OfferSuccess;
