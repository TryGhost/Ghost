import Button from '../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import Toggle from '../../../admin-x-ds/global/Toggle';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const Analytics: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = () => {
        setCurrentState('unsaved');
    };

    const inputs = (
        <SettingGroupContent columns={2}>
            <Toggle
                // direction='rtl'
                hint='Record when a member opens an email'
                id='newsletter-opens'
                label='Newsletter opens'
                onChange={handleStateChange}
            />
            <Toggle
                // direction='rtl'
                hint='Record when a member clicks on any link in an email'
                id='newsletter-clicks'
                label='Newsletter clicks'
                onChange={handleStateChange}
            />
            <Toggle
                // direction='rtl'
                hint='Track the traffic sources and posts that drive the most member growth'
                id='member-sources'
                label='Member sources'
                onChange={handleStateChange}
            />
            <Toggle
                // direction='rtl'
                hint='Make it easier for other sites to track the traffic you send them in their analytics'
                id='outbound-links'
                label='Outbound link tagging'
                onChange={handleStateChange}
            />
        </SettingGroupContent>
    );

    const buttons = <ButtonGroup buttons={[
        {
            label: 'Cancel'
        },
        {
            label: 'Save',
            color: 'green'
        }
    ]} link={true} />;

    return (
        <SettingGroup
            customButtons={currentState === 'unsaved' ? buttons : <></>}
            description='Decide what data you collect from your members'
            state={currentState}
            title='Analytics'
        >
            {inputs}
            <div className='mt-1'>
                <Button color='green' label='Export analytics' link={true} />
            </div>
        </SettingGroup>
    );
};

export default Analytics;