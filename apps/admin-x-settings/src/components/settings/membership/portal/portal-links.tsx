import React, {useEffect, useId, useState} from 'react';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Field, FieldLabel, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Button} from '@tryghost/shade/components';
import {ModalPage} from '@tryghost/shade/page-templates';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/global-data-provider';

interface PortalLinkPrefs {
    name: string;
    value: string;
}

const PortalLink: React.FC<PortalLinkPrefs> = ({name, value}) => {
    const id = useId();

    return (
        <ActionListItem>
            <ActionListItemContent className='flex w-full grow flex-col py-3 lg:flex-row lg:items-center lg:gap-5'>
                <label className='inline-block whitespace-nowrap lg:w-[180px] lg:min-w-[180px]' htmlFor={id}>{name}:</label>
                <Input className='grow border-0 border-b border-border bg-transparent py-1 text-muted-foreground shadow-none lg:p-1' id={id} value={value} disabled />
            </ActionListItemContent>
            <ActionListItemActions><Button size='sm' type='button' variant='ghost' onClick={async (e) => {
                const button = e.currentTarget;
                try {
                    await navigator.clipboard.writeText(value);
                    button.innerText = 'Copied';
                    setTimeout(() => {
                        button.innerText = 'Copy';
                    }, 1000);
                } catch {
                    // Leave the label unchanged when clipboard access is denied.
                }
            }}>Copy</Button></ActionListItemActions>
        </ActionListItem>
    );
};

const PortalLinks: React.FC = () => {
    const [isDataAttributes, setIsDataAttributes] = useState(false);
    const [selectedTier, setSelectedTier] = useState('');
    const {siteData, settings} = useGlobalData();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const tiers = getPaidActiveTiers(allTiers || []);
    const [paidMembersEnabled] = getSettingValues(settings, ['paid_members_enabled']) as [boolean];

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
        <ModalPage className='max-w-[920px] text-base text-foreground'>
            <ModalPage.Title>Links</ModalPage.Title>
            <p className='-mt-6 mb-16'>Use these {isDataAttributes ? 'data attributes' : 'links'} in your theme to show pages of Portal.</p>

            <section>
                <div className='flex items-center justify-between border-b border-border pb-2'>
                    <h2 className='text-xl font-semibold'>Generic</h2>
                    <Button size='sm' type='button' variant='ghost' onClick={toggleIsDataAttributes}>{isDataAttributes ? 'Links' : 'Data attributes'}</Button>
                </div>
                <ActionList>
                    <PortalLink name='Default' value={isDataAttributes ? 'data-portal' : `${homePageURL}#/portal`} />
                    <PortalLink name='Sign in' value={isDataAttributes ? 'data-portal="signin"' : `${homePageURL}#/portal/signin`} />
                    <PortalLink name='Sign up' value={isDataAttributes ? 'data-portal="signup"' : `${homePageURL}#/portal/signup`} />
                    {paidMembersEnabled && <PortalLink name='Gift subscriptions' value={isDataAttributes ? 'data-portal="gift"' : `${homePageURL}#/portal/gift`} />}
                </ActionList>
            </section>

            <section className='mt-14'>
                <h2 className='border-b border-border pb-2 text-xl font-semibold'>Tiers</h2>
                <ActionList>
                    <ActionListItem>
                        <ActionListItemContent className='flex w-full items-center gap-2 py-2'>
                        <span className='inline-block w-[180px] min-w-[180px] shrink-0'>Tier:</span>
                        <Field className='grow'>
                            <FieldLabel className='sr-only'>Tier</FieldLabel>
                            <Select value={selectedTier} onValueChange={setSelectedTier}>
                                <SelectTrigger aria-label='Tier'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {tierOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        </ActionListItemContent>
                    </ActionListItem>
                    <PortalLink name='Signup / Monthly' value={isDataAttributes ? `data-portal="signup/${selectedTier}/monthly"` : `${homePageURL}#/portal/signup/${selectedTier}/monthly`} />
                    <PortalLink name='Signup / Yearly' value={isDataAttributes ? `data-portal="signup/${selectedTier}/yearly"` : `${homePageURL}#/portal/signup/${selectedTier}/yearly`} />
                    <PortalLink name='Signup / Free' value={isDataAttributes ? 'data-portal="signup/free"' : `${homePageURL}#/portal/signup/free`} />
                </ActionList>
            </section>

            <section className='mt-14'>
                <h2 className='border-b border-border pb-2 text-xl font-semibold'>Account</h2>
                <ActionList>
                    <PortalLink name='Account' value={isDataAttributes ? 'data-portal="account"' : `${homePageURL}#/portal/account`} />
                    <PortalLink name='Account / Plans' value={isDataAttributes ? 'data-portal="account/plans"' : `${homePageURL}#/portal/account/plans`} />
                    <PortalLink name='Account / Profile' value={isDataAttributes ? 'data-portal="account/profile"' : `${homePageURL}#/portal/account/profile`} />
                    <PortalLink name='Account / Newsletters' value={isDataAttributes ? 'data-portal="account/newsletters"' : `${homePageURL}#/portal/account/newsletters`} />
                    <PortalLink name='Account / Newsletter help' value={isDataAttributes ? 'data-portal="account/newsletters/help"' : `${homePageURL}#/portal/account/newsletters/help`} />
                </ActionList>
            </section>
        </ModalPage>

    );
};

export default PortalLinks;
