**To describe container instance**

The following ``describe-container-instances`` example retrieves details for a container instance in the ``update`` cluster, using the container instance UUID as an identifier. ::

    aws ecs describe-container-instances \
        --cluster update \
        --container-instances a1b2c3d4-5678-90ab-cdef-11111EXAMPLE

Output::

    {
        "failures": [],
        "containerInstances": [
            {
                "status": "ACTIVE",
                "registeredResources": [
                    {
                        "integerValue": 2048,
                        "longValue": 0,
                        "type": "INTEGER",
                        "name": "CPU",
                        "doubleValue": 0.0
                    },
                    {
                        "integerValue": 3955,
                        "longValue": 0,
                        "type": "INTEGER",
                        "name": "MEMORY",
                        "doubleValue": 0.0
                    },
                    {
                        "name": "PORTS",
                        "longValue": 0,
                        "doubleValue": 0.0,
                        "stringSetValue": [
                            "22",
                            "2376",
                            "2375",
                            "51678"
                        ],
                        "type": "STRINGSET",
                        "integerValue": 0
                    }
                ],
                "ec2InstanceId": "i-A1B2C3D4",
                "agentConnected": true,
                "containerInstanceArn": "arn:aws:ecs:us-west-2:123456789012:container-instance/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "pendingTasksCount": 0,
                "remainingResources": [
                    {
                        "integerValue": 2048,
                        "longValue": 0,
                        "type": "INTEGER",
                        "name": "CPU",
                        "doubleValue": 0.0
                    },
                    {
                        "integerValue": 3955,
                        "longValue": 0,
                        "type": "INTEGER",
                        "name": "MEMORY",
                        "doubleValue": 0.0
                    },
                    {
                        "name": "PORTS",
                        "longValue": 0,
                        "doubleValue": 0.0,
                        "stringSetValue": [
                            "22",
                            "2376",
                            "2375",
                            "51678"
                        ],
                        "type": "STRINGSET",
                        "integerValue": 0
                    }
                ],
                "runningTasksCount": 0,
                "versionInfo": {
                    "agentVersion": "1.0.0",
                    "agentHash": "4023248",
                    "dockerVersion": "DockerVersion: 1.5.0"
                }
            }
        ]
    }

For more information, see `Amazon ECS Container Instances <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html>`_ in the *Amazon ECS Developer Guide*.
