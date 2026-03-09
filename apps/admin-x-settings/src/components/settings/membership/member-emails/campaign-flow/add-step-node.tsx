import React from 'react';
import {Handle, Position} from '@xyflow/react';
import type {AddStepNodeData} from './flow-types';
import type {NodeProps} from '@xyflow/react';

const AddStepNode: React.FC<NodeProps> = ({data}) => {
    const {onAdd} = data as AddStepNodeData;

    return (
        <div>
            <Handle
                className='!opacity-0'
                position={Position.Top}
                type='target'
            />
            <button
                className='flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-grey-300 bg-transparent px-3 py-1.5 text-xs font-semibold text-green hover:border-green hover:text-green-500 dark:border-grey-800 dark:hover:border-green'
                type='button'
                onClick={onAdd}
            >
                + Add step
            </button>
        </div>
    );
};

export default AddStepNode;
