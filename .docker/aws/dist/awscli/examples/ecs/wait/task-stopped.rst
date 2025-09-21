**Example 1: Wait until an ECS task is in stopped state**

The following ``wait tasks-stopped`` example waits until the provided tasks in the command are in a stopped state. You can pass IDs or full ARN of the tasks. This example uses ID of the task. ::

    aws ecs wait tasks-stopped \
        --cluster MyCluster \ 
        --tasks 2c196f0a00dd4f58b7c8897a5c7bce13

This command produces no output.

**Example 2: Wait until multiple ECS tasks are in stopped state**

The following ``wait tasks-stopped`` example waits until the multiple tasks provided in the command are in a stopped state. You can pass IDs or full ARN of the tasks. This example uses IDs of the tasks. ::

    aws ecs wait tasks-stopped \
        --cluster MyCluster \ 
        --tasks 2c196f0a00dd4f58b7c8897a5c7bce13 4d590253bb114126b7afa7b58EXAMPLE

This command produces no output.



