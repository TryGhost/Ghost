import CodeModal from './code/code-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button} from '@tryghost/shade/components';
import {SettingGroupHeader} from '@tryghost/admin-x-design-system';
import {withErrorBoundary} from '../../error-boundary';

const CodeInjection: React.FC<{ keywords: string[] }> = ({keywords}) => {
    return (
        <TopLevelGroup
            customHeader={
                <div className='z-10 flex items-start justify-between'>
                    <SettingGroupHeader description='Add custom code to your publication.' title='Code injection' />
                    <Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={() => {
                        NiceModal.show(CodeModal);
                    }}>Open</Button>
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
