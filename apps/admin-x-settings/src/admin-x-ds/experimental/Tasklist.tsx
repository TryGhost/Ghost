import React from 'react';
import Task from './Task';

interface Props {
    loading: boolean,
    tasks: Array<{
        id: string, 
        title: string,
        state: string,
    }>,
    onArchiveTask: (id: string) => void,
    onPinTask: (id: string) => void,
}

const TaskList: React.FC<Props> = ({loading, tasks, onPinTask, onArchiveTask}) => {
    const events = {
        onPinTask,
        onArchiveTask
    };

    if (loading) {
        return <div>Loading</div>;
    }

    if (tasks.length === 0) {
        return <div>empty</div>;
    }

    return (
        <div>
            {tasks.map(task => (
                <Task key={task.id} task={task} {...events} />
            ))}
        </div>
    );
};

export default TaskList;