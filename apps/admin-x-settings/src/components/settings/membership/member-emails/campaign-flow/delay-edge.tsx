import React, {useCallback, useState} from 'react';
import {EdgeLabelRenderer, getStraightPath} from '@xyflow/react';
import type {DelayEdgeData} from './flow-types';
import type {EdgeProps} from '@xyflow/react';

const DelayEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data
}) => {
    const {label, stepId, onEditDelay} = (data || {}) as DelayEdgeData;
    const [editing, setEditing] = useState(false);
    const [delayValue, setDelayValue] = useState('');
    const [edgePath, labelX, labelY] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY
    });

    const commitDelay = useCallback(() => {
        const parsed = parseInt(delayValue);
        const newDelay = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        setEditing(false);
        if (stepId && onEditDelay) {
            onEditDelay(stepId, newDelay);
        }
    }, [delayValue, stepId, onEditDelay]);

    const canEdit = Boolean(stepId && onEditDelay);

    return (
        <>
            <path
                className='fill-none stroke-grey-200 dark:stroke-grey-900'
                d={edgePath}
                id={id}
                strokeWidth={1}
            />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        className='absolute'
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
                        }}
                    >
                        {editing ? (
                            <div className='flex items-center gap-1.5 rounded bg-white px-2 py-1 shadow-sm dark:bg-grey-950'>
                                <input
                                    className='w-12 rounded border border-green bg-grey-50 px-1.5 py-0.5 text-center text-sm text-grey-700 outline-none dark:bg-grey-900 dark:text-grey-400'
                                    min='0'
                                    type='number'
                                    value={delayValue}
                                    autoFocus
                                    onBlur={commitDelay}
                                    onChange={e => setDelayValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            commitDelay();
                                        }
                                        if (e.key === 'Escape') {
                                            setEditing(false);
                                        }
                                    }}
                                />
                                <span className='text-sm text-grey-500'>days</span>
                            </div>
                        ) : canEdit ? (
                            <button
                                className='cursor-pointer text-sm text-grey-500 hover:text-grey-700 dark:text-grey-500 dark:hover:text-grey-300'
                                title='Click to edit delay'
                                type='button'
                                onClick={() => {
                                    const match = label.match(/(\d+)/);
                                    setDelayValue(match ? match[1] : '0');
                                    setEditing(true);
                                }}
                            >
                                {label}
                            </button>
                        ) : (
                            <span className='pointer-events-none text-sm text-grey-500 dark:text-grey-500'>
                                {label}
                            </span>
                        )}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default DelayEdge;
