**Example 1: To list the tasks in a cluster**

The following ``list-tasks`` example lists all of the tasks in a cluster. ::

    aws ecs list-tasks --cluster default

Output::

    {
        "taskArns": [
            "arn:aws:ecs:us-west-2:123456789012:task/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "arn:aws:ecs:us-west-2:123456789012:task/a1b2c3d4-5678-90ab-cdef-22222EXAMPLE"
        ]
    }

**Example 2: To list the tasks on a particular container instance**

The following ``list-tasks`` example lists the tasks on a container instance, using the container instance UUID as a filter. ::

    aws ecs list-tasks --cluster default --container-instance a1b2c3d4-5678-90ab-cdef-33333EXAMPLE

Output::

    {
        "taskArns": [
            "arn:aws:ecs:us-west-2:123456789012:task/a1b2c3d4-5678-90ab-cdef-44444EXAMPLE"
        ]
    }

For more information, see `Amazon ECS Task Definitions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html>`_ in the *Amazon ECS Developer Guide*.
