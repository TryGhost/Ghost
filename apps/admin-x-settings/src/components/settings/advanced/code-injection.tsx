import CodeModal from './code/code-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button} from '@tryghost/shade/components';
import {withErrorBoundary} from '../../error-boundary';

const CodeInjection: React.FC<{ keywords: string[] }> = ({keywords}) => {
    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={() => {
                NiceModal.show(CodeModal);
            }}>Open</Button>}
            description="Add custom code to your publication"
            keywords={keywords}
            navid='code-injection'
            testId='code-injection'
            title="Code injection"
        />
    );
};

export default withErrorBoundary(CodeInjection, 'Code injection');
