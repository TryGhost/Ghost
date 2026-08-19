import React, {useEffect, useState} from 'react';
import {CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue, Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {ModalPage} from '@tryghost/shade/page-templates';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@/settings/providers/global-data-context';

interface PortalLinkPrefs {
    name: string;
    value: string;
}

const PortalLink: React.FC<PortalLinkPrefs> = ({name, value}) => {
    return (
        <CopyField className='lg:flex-row lg:items-center lg:gap-5' value={value}>
            <CopyFieldLabel className='shrink-0 whitespace-nowrap lg:w-[180px]'>
                {name}
            </CopyFieldLabel>
            <CopyFieldContent>
                <CopyFieldValue />
                <CopyFieldActions>
                    <CopyFieldCopyButton />
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    );
};

const PortalLinks: React.FC = () => {
    const [isDataAttributes, setIsDataAttributes] = useState(false);
    const [selectedTier, setSelectedTier] = useState('');
    const {siteData, settings} = useGlobalData();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const tiers = getPaidActiveTiers(allTiers || []);
    const [paidMembersEnabled] = getSettingValues(settings, ['paid_members_enabled']) as [boolean];

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

    const homePageURL = getHomepageUrl(siteData);

    return (
        <ModalPage className='max-w-[920px] text-base text-foreground'>
            <Stack gap='2xl'>
                <Stack gap='xs'>
                    <ModalPage.Title className='mb-0'>Links</ModalPage.Title>
                    <Text>Use these {isDataAttributes ? 'data attributes' : 'links'} in your theme to show pages of Portal.</Text>
                </Stack>

                <section>
                    <Stack gap='lg'>
                        <Inline as='header' className='border-b border-border pb-2' justify='between'>
                            <Text as='h2' size='xl' weight='semibold'>Generic</Text>
                            <Tabs value={isDataAttributes ? 'data-attributes' : 'links'} variant='segmented-sm' onValueChange={value => setIsDataAttributes(value === 'data-attributes')}>
                                <TabsList aria-label='Portal link format'>
                                    <TabsTrigger value='links'>Links</TabsTrigger>
                                    <TabsTrigger value='data-attributes'>Data attributes</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </Inline>
                        <Stack gap='md'>
                            <PortalLink name='Default' value={isDataAttributes ? 'data-portal' : `${homePageURL}#/portal`} />
                            <PortalLink name='Sign in' value={isDataAttributes ? 'data-portal="signin"' : `${homePageURL}#/portal/signin`} />
                            <PortalLink name='Sign up' value={isDataAttributes ? 'data-portal="signup"' : `${homePageURL}#/portal/signup`} />
                            {paidMembersEnabled && <PortalLink name='Gift subscriptions' value={isDataAttributes ? 'data-portal="gift"' : `${homePageURL}#/portal/gift`} />}
                        </Stack>
                    </Stack>
                </section>

                <section>
                    <Stack gap='lg'>
                        <Text as='h2' className='border-b border-border pb-2' size='xl' weight='semibold'>Tiers</Text>
                        <Stack gap='md'>
                            <Field className='lg:flex-row lg:items-center lg:justify-between lg:gap-5 [&>*]:w-auto'>
                                <FieldLabel className='shrink-0 whitespace-nowrap lg:w-[180px]'>Tier</FieldLabel>
                                <Select value={selectedTier} onValueChange={setSelectedTier}>
                                    <SelectTrigger aria-label='Tier' className='w-fit'><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {tierOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <PortalLink name='Signup / Monthly' value={isDataAttributes ? `data-portal="signup/${selectedTier}/monthly"` : `${homePageURL}#/portal/signup/${selectedTier}/monthly`} />
                            <PortalLink name='Signup / Yearly' value={isDataAttributes ? `data-portal="signup/${selectedTier}/yearly"` : `${homePageURL}#/portal/signup/${selectedTier}/yearly`} />
                            <PortalLink name='Signup / Free' value={isDataAttributes ? 'data-portal="signup/free"' : `${homePageURL}#/portal/signup/free`} />
                        </Stack>
                    </Stack>
                </section>

                <section>
                    <Stack gap='lg'>
                        <Text as='h2' className='border-b border-border pb-2' size='xl' weight='semibold'>Account</Text>
                        <Stack gap='md'>
                            <PortalLink name='Account' value={isDataAttributes ? 'data-portal="account"' : `${homePageURL}#/portal/account`} />
                            <PortalLink name='Account / Plans' value={isDataAttributes ? 'data-portal="account/plans"' : `${homePageURL}#/portal/account/plans`} />
                            <PortalLink name='Account / Profile' value={isDataAttributes ? 'data-portal="account/profile"' : `${homePageURL}#/portal/account/profile`} />
                            <PortalLink name='Account / Newsletters' value={isDataAttributes ? 'data-portal="account/newsletters"' : `${homePageURL}#/portal/account/newsletters`} />
                            <PortalLink name='Account / Newsletter help' value={isDataAttributes ? 'data-portal="account/newsletters/help"' : `${homePageURL}#/portal/account/newsletters/help`} />
                        </Stack>
                    </Stack>
                </section>
            </Stack>
        </ModalPage>

    );
};

export default PortalLinks;
