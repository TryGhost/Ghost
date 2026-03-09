import React from 'react';
import {Handle, Position} from '@xyflow/react';
import type {NodeProps} from '@xyflow/react';
import type {TriggerNodeData} from './flow-types';

const TriggerNode: React.FC<NodeProps> = ({data}) => {
    const {label} = data as TriggerNodeData;

    return (
        <div className='pointer-events-none flex cursor-default items-center justify-center rounded-full border border-grey-200 bg-white px-5 py-2 text-sm font-semibold text-grey-800 shadow-sm dark:border-grey-900 dark:bg-grey-950 dark:text-grey-300'>
            <span className='mr-1.5'>⚡</span>
            {label}
            <Handle
                className='!opacity-0'
                position={Position.Bottom}
                type='source'
            />
        </div>
    );
};

export default TriggerNode;
