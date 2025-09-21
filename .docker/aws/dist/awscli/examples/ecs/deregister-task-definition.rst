**To deregister a task definition**

The following ``deregister-task-definition`` example deregisters the first revision of the ``curler`` task definition in your default region. ::

  aws ecs deregister-task-definition --task-definition curler:1

Note that in the resulting output, the task definition status shows ``INACTIVE``::

    {
        "taskDefinition": {
            "status": "INACTIVE",
            "family": "curler",
            "volumes": [],
            "taskDefinitionArn": "arn:aws:ecs:us-west-2:123456789012:task-definition/curler:1",
            "containerDefinitions": [
                {
                    "environment": [],
                    "name": "curler",
                    "mountPoints": [],
                    "image": "curl:latest",
                    "cpu": 100,
                    "portMappings": [],
                    "entryPoint": [],
                    "memory": 256,
                    "command": [
                        "curl -v http://example.com/"
                    ],
                    "essential": true,
                    "volumesFrom": []
                }
            ],
            "revision": 1
        }
    }

For more information, see `Amazon ECS Task Definitions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html>`_ in the *Amazon ECS Developer Guide*.
