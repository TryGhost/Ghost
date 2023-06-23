import Task from './Task';

const story = {
    component: Task,
    title: 'Experimental / Task',
    tags: ['autodocs']
};

export default story;

export const Default = {
    args: {
        task: {
            id: '1',
            title: 'Test task',
            state: 'TASK_INBOX'
        }
    }
};

export const Pinned = {
    args: {
        task: {
            ...Default.args.task,
            state: 'TASK_PINNED'
        }
    }
};

export const Archived = {
    args: {
        task: {
            ...Default.args.task,
            state: 'TASK_ARCHIVED'
        }
    }
};