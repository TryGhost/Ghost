import CodeModal from './code/CodeModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, SettingGroupHeader, withErrorBoundary} from '@tryghost/admin-x-design-system';

const CodeInjection: React.FC<{ keywords: string[] }> = ({keywords}) => {
    return (
        <TopLevelGroup
            customHeader={
                <div className='z-10 flex items-start justify-between'>
                    <SettingGroupHeader description='Add custom code to your publication.' title='Code injection' />
                    <Button className='mt-[-5px]' color='clear' label='Open' size='sm' onClick={() => {
                        NiceModal.show(CodeModal);
                    }} />
                </div>
            }
            description="Add custom code to your publication"
            keywords={keywords}
            navid='code-injection'
            testId='code-injection'
            title="Code injection"
        />
    );
};

export default withErrorBoundary(CodeInjection, 'Code injection');
