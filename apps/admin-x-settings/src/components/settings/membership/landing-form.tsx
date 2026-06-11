import * as customFields from '../../../../../../poc/custom-fields/repo';
import LandingFormModal from './landing-form/landing-form-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, List, ListItem, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';

// POC Story 5: the Landing form section mirrors the Welcome emails pattern —
// "Customize" at the top opens the two-pane modal (preview + field picker), and a
// list row carries the form's audience + an on/off toggle. The single row + top
// "Customize" become the multi-form list + "Add landing form" in Story 5.5.
const SETTING_KEY = 'landingFormEnabled';

const LandingForm: React.FC<{keywords: string[]}> = ({keywords}) => {
    const [enabled, setEnabled] = useState(false);

    const refresh = useCallback(async () => {
        setEnabled(Boolean(await customFields.getSetting(SETTING_KEY)));
    }, []);

    useEffect(() => {
        refresh();
        return customFields.subscribe(refresh);
    }, [refresh]);

    const onToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.checked;
        setEnabled(value);
        customFields.setSetting(SETTING_KEY, value);
    };

    return (
        <TopLevelGroup
            customButtons={<Button color='clear' label='Customize' size='sm' onClick={() => NiceModal.show(LandingFormModal)} />}
            description='Collect extra information from members when they next visit your site'
            keywords={keywords}
            navid='landing-form'
            testId='landing-form'
            title='Landing form'
        >
            <List>
                <ListItem
                    action={<Toggle checked={enabled} direction='rtl' testId='landing-form-toggle' onChange={onToggle} />}
                    detail='Shown to members on their next visit'
                    hideActions={false}
                    testId='landing-form-row'
                    title='All members'
                />
            </List>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(LandingForm, 'Landing form');
