import TaskList from "./Tasklist";

import * as TaskStories from './Task.stories';

export default {
    component: TaskList,
    title: 'Experimental / Task List',
    decorators: [(story: any) => <div style={{padding: '3rem'}}>{story()}</div>],
    tags: ['autodocs'],
};

export const Default = {
    args: {
        tasks: [
            { ...TaskStories.Default.args.task, id: '1', title: 'Task 1'},
            { ...TaskStories.Default.args.task, id: '2', title: 'Task 2'},
            { ...TaskStories.Default.args.task, id: '3', title: 'Task 3'},
            { ...TaskStories.Default.args.task, id: '4', title: 'Task 4'},
        ],
    },
};

export const WithPinnedTasks = {
    args: {
        tasks: [
            ...Default.args.tasks.slice(0, 3),
            {id: '6', title: 'Task 6 (pinned)', state: 'TASK_PINNED'},
        ],
    },
};

export const Loading = {
    args: {
        tasks: [],
        loading: true,
    },
};

export const Empty = {
    args: {
        ...Loading.args,
        loading: false,
    },
};