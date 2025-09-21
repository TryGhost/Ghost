**Example 1: To list the registered task definitions**

The following ``list-task-definitions`` example lists all of the registered task definitions. ::

    aws ecs list-task-definitions

Output::

    {
        "taskDefinitionArns": [
            "arn:aws:ecs:us-west-2:123456789012:task-definition/sleep300:2",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/sleep360:1",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:3",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:4",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:5",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:6"
        ]
    }

**Example 2: To list the registered task definitions in a family**

The following `list-task-definitions` example lists the task definition revisions of a specified family. ::

    aws ecs list-task-definitions --family-prefix wordpress

Output::

    {
        "taskDefinitionArns": [
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:3",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:4",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:5",
            "arn:aws:ecs:us-west-2:123456789012:task-definition/wordpress:6"
        ]
    }

For more information, see `Amazon ECS Task Definitions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html>`_ in the *Amazon ECS Developer Guide*.
