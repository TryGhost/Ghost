import Button from '../../../../admin-x-ds/global/Button';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import ModalPage from '../../../../admin-x-ds/global/modal/ModalPage';
import React, {useEffect, useId, useState} from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {getHomepageUrl} from '../../../../api/site';
import {getPaidActiveTiers, useBrowseTiers} from '../../../../api/tiers';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

interface PortalLinkPrefs {
    name: string;
    value: string;
}

const PortalLink: React.FC<PortalLinkPrefs> = ({name, value}) => {
    const id = useId();

    return (
        <ListItem
            action={<Button color='black' label='Copy' link onClick={(e) => {
                navigator.clipboard.writeText(value);
                const button = e?.target as HTMLButtonElement;
                button.innerText = 'Copied';
                setTimeout(() => {
                    button.innerText = 'Copy';
                }, 1000);
            }}/>}
            hideActions
            separator
        >
            <div className='flex w-full grow items-center gap-5 py-3'>
                <label className='inline-block w-[240px] whitespace-nowrap' htmlFor={id}>{name}</label>
                <TextField className='border-b-500 grow bg-transparent p-1 text-grey-700' id={id} value={value} disabled unstyled />
            </div>
        </ListItem>
    );
};

const PortalLinks: React.FC = () => {
    const [isDataAttributes, setIsDataAttributes] = useState(false);
    const [selectedTier, setSelectedTier] = useState('');
    const {siteData} = useGlobalData();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const tiers = getPaidActiveTiers(allTiers || []);

    const toggleIsDataAttributes = () => {
        setIsDataAttributes(!isDataAttributes);
    };

    useEffect(() => {
        if (tiers?.length && !selectedTier) {
            setSelectedTier(tiers[0].id);
        }
    }, [tiers, selectedTier]);

    const tierOptions = tiers?.map((tier) => {
        return {
            label: tier.name,
            value: tier.id
        };
    });

    const homePageURL = getHomepageUrl(siteData!);

    return (
        <ModalPage className='max-w-[920px] text-base text-black' heading='Links'>
            <p className='-mt-6 mb-16'>Use these {isDataAttributes ? 'data attributes' : 'links'} in your theme to show pages of Portal.</p>

            <List actions={<Button color='green' label={isDataAttributes ? 'Links' : 'Data attributes'} link onClick={toggleIsDataAttributes}/>} title='Generic' titleSize='lg'>
                <PortalLink name='Default' value={isDataAttributes ? 'data-portal' : `${homePageURL}#/portal`} />
                <PortalLink name='Sign in' value={isDataAttributes ? 'data-portal="signin"' : `${homePageURL}#/portal/signin`} />
                <PortalLink name='Sign up' value={isDataAttributes ? 'data-portal="signup"' : `${homePageURL}#/portal/signup`} />
            </List>

            <List className='mt-14' title='Tiers' titleSize='lg'>
                <ListItem
                    hideActions
                    separator
                >
                    <div className='flex w-full items-center gap-5 py-2 pr-6'>
                        <span className='inline-block w-[240px] shrink-0'>Tier</span>
                        <Select
                            options={tierOptions}
                            selectedOption={tierOptions.find(option => option.value === selectedTier)}
                            onSelect={(option) => {
                                if (option) {
                                    setSelectedTier(option?.value);
                                }
                            }}
                        />
                    </div>
                </ListItem>
                <PortalLink name='Signup / Monthly' value={isDataAttributes ? `data-portal="signup/${selectedTier}/monthly"` : `${homePageURL}#/portal/signup/${selectedTier}/monthly`} />
                <PortalLink name='Signup / Yearly' value={isDataAttributes ? `data-portal="signup/${selectedTier}/yearly"` : `${homePageURL}#/portal/signup/${selectedTier}/yearly`} />
                <PortalLink name='Signup / Free' value={isDataAttributes ? 'data-portal="signup/free"' : `${homePageURL}#/portal/signup/free`} />
            </List>

            <List className='mt-14' title='Account' titleSize='lg'>
                <PortalLink name='Account' value={isDataAttributes ? 'data-portal="account"' : `${homePageURL}#/portal/account`} />
                <PortalLink name='Account / Plans' value={isDataAttributes ? 'data-portal="account/plans"' : `${homePageURL}#/portal/account/plans`} />
                <PortalLink name='Account / Profile' value={isDataAttributes ? 'data-portal="account/profile"' : `${homePageURL}#/portal/account/profile`} />
                <PortalLink name='Account / Newsletters' value={isDataAttributes ? 'data-portal="account/newsletters"' : `${homePageURL}#/portal/account/newsletters`} />
            </List>
        </ModalPage>

    );
};

export default PortalLinks;
