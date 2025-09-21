**To delete a task definition**

The following ``delete-task-definitions`` example deletes an INACTIVE task definition. ::

    aws ecs delete-task-definitions \
        --task-definition curltest:1

Output::

    {
    "taskDefinitions": [
        {
            "taskDefinitionArn": "arn:aws:ecs:us-east-1:123456789012:task-definition/curltest:1",
            "containerDefinitions": [
                {
                    "name": "ctest",
                    "image": "mreferre/eksutils",
                    "cpu": 0,
                    "portMappings": [],
                    "essential": true,
                    "entryPoint": [
                        "sh",
                        "-c"
                    ],
                    "command": [
                        "curl ${ECS_CONTAINER_METADATA_URI_V4}/task"
                    ],
                    "environment": [],
                    "mountPoints": [],
                    "volumesFrom": [],
                    "logConfiguration": {
                        "logDriver": "awslogs",
                        "options": {
                            "awslogs-create-group": "true",
                            "awslogs-group": "/ecs/curltest",
                            "awslogs-region": "us-east-1",
                            "awslogs-stream-prefix": "ecs"
                        }
                    }
                }
            ],
            "family": "curltest",
            "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
            "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
            "networkMode": "awsvpc",
            "revision": 1,
            "volumes": [],
            "status": "DELETE_IN_PROGRESS",
            "compatibilities": [
                "EC2",
                "FARGATE"
            ],
            "requiresCompatibilities": [
                "FARGATE"
            ],
            "cpu": "256",
            "memory": "512",
            "registeredAt": "2021-09-10T12:56:24.704000+00:00",
            "deregisteredAt": "2023-03-14T15:20:59.419000+00:00",
            "registeredBy": "arn:aws:sts::123456789012:assumed-role/Admin/jdoe"
            }
        ],
        "failures": []
    }

For more information, see `Amazon ECS Task Definitions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html>`_ in the *Amazon ECS Developer Guide*.
