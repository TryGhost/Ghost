import React from 'react';

interface Props {
    task: {
        id: string,
        title: string,
        state: string,
    }
    onArchiveTask: (id: string) => void,
    onPinTask: (id: string) => void,
}

const Task: React.FC<Props> = ({task: {id, title, state}, onArchiveTask, onPinTask}) => {
    return (
        <div className={`list-item ${state}`}>
            <label
                aria-label={title}
                className="checkbox"
                htmlFor="title"
            >
                <input
                    checked={state === 'TASK_ARCHIVED'}
                    disabled={true}
                    id={`archiveTask-${id}`}
                    name="checked"
                    type="checkbox"
                />
                <span
                    className="checkbox-custom"
                    onClick={() => onArchiveTask(id)}
                />
            </label>

            <label
                aria-label={title}
                className="title"
                htmlFor="title"
            >
                <input
                    name="title"
                    placeholder="Input title"
                    readOnly={true}
                    type="text"
                    value={title}
                />
            </label>

            {state !== 'TASK_ARCHIVED' && (
                <button
                    key={`pinTask-${id}`}
                    aria-label={`pinTask-${id}`}
                    className="pin-button"
                    id={`pinTask-${id}`}
                    type="button"
                    onClick={() => onPinTask(id)}
                >
                    <span className={`icon-star`} />
                </button>
            )}
        </div>
    );
};

export default Task;