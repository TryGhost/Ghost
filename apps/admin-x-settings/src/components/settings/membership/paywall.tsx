import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Table, TableCell, TableRow, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const Paywall: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();

    const [
        headingMembers, signupDescription, signupButtonText,
        headingPaid, headingTiers, description, buttonText, offerCode
    ] = getSettingValues(settings, [
        'paywall_heading_members', 'paywall_signup_description', 'paywall_signup_button_text',
        'paywall_heading_paid', 'paywall_heading_tiers', 'paywall_description', 'paywall_button_text', 'paywall_offer_code'
    ]) as (string | null)[];

    const signupSummary = headingMembers || signupDescription || signupButtonText
        ? `“${headingMembers || 'This post is for subscribers only'}”`
        : 'Default message';
    const paymentSummary = headingPaid || headingTiers || description || buttonText || offerCode
        ? `“${headingPaid || 'This post is for paying subscribers only'}”${offerCode ? ' · offer attached' : ''}`
        : 'Default message';

    const walls = [
        {
            route: 'paywall/signup',
            testId: 'signup-wall',
            title: 'Sign-up wall',
            detail: 'Members-only posts · free signup',
            summary: signupSummary
        },
        {
            route: 'paywall/payment',
            testId: 'payment-wall',
            title: 'Payment wall',
            detail: 'Paid and tier-restricted posts · site & email',
            summary: paymentSummary
        }
    ];

    return (
        <TopLevelGroup
            description='Customize the two messages shown in place of restricted content: the free sign-up wall and the payment wall'
            keywords={keywords}
            navid='paywall'
            testId='paywall'
            title='Paywall'
        >
            <Table>
                {walls.map(wall => (
                    <TableRow
                        key={wall.route}
                        action={<Button color='green' data-testid={`${wall.testId}-edit`} label='Edit' link onClick={() => updateRoute(wall.route)} />}
                        hideActions
                    >
                        <TableCell className='w-full' onClick={() => updateRoute(wall.route)}>
                            <div className='text-sm font-semibold'>{wall.title}</div>
                            <div className='text-xs text-grey-700 dark:text-grey-500'>{wall.detail}</div>
                        </TableCell>
                        <TableCell className='hidden text-right text-xs whitespace-nowrap text-grey-700 md:table-cell! dark:text-grey-500' onClick={() => updateRoute(wall.route)}>
                            {wall.summary}
                        </TableCell>
                    </TableRow>
                ))}
            </Table>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Paywall, 'Paywall');
