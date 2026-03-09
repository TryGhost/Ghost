import React from 'react';
import {Handle, Position} from '@xyflow/react';
import type {NodeProps} from '@xyflow/react';
import type {StepNodeData} from './flow-types';

const CampaignStepNode: React.FC<NodeProps> = ({data}) => {
    const {step, onEdit, onDelete} = data as StepNodeData;

    return (
        <div className='group relative rounded-lg border border-grey-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-grey-900 dark:bg-grey-950'>
            <Handle
                className='!opacity-0'
                position={Position.Top}
                type='target'
            />
            <button
                className='block w-full cursor-pointer text-left'
                type='button'
                onClick={() => onEdit(step)}
            >
                <div className='font-semibold text-black dark:text-white'>
                    {step.name}
                </div>
                <div className='mt-0.5 truncate text-sm text-grey-600 dark:text-grey-500'>
                    {step.subject}
                </div>
            </button>
            <div className='absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
                <button
                    className='cursor-pointer rounded p-1 text-grey-500 hover:bg-grey-100 hover:text-black dark:text-grey-600 dark:hover:bg-grey-900 dark:hover:text-white'
                    title='Edit'
                    type='button'
                    onClick={() => onEdit(step)}
                >
                    <svg fill='none' height='14' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' viewBox='0 0 24 24' width='14'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' /><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' /></svg>
                </button>
                <button
                    className='cursor-pointer rounded p-1 text-grey-500 hover:text-red-500 dark:text-grey-600 dark:hover:text-red-400'
                    title='Delete'
                    type='button'
                    onClick={() => onDelete(step)}
                >
                    <svg fill='none' height='14' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' viewBox='0 0 24 24' width='14'><polyline points='3 6 5 6 21 6' /><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' /></svg>
                </button>
            </div>
            <Handle
                className='!opacity-0'
                position={Position.Bottom}
                type='source'
            />
        </div>
    );
};

export default CampaignStepNode;
