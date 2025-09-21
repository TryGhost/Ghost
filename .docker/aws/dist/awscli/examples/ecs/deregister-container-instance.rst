**To deregister a container instance from a cluster**

The following ``deregister-container-instance`` example deregisters a container instance from the specified cluster. If there are still tasks running in the container instance, you must either stop those tasks before deregistering, or use the ``--force`` option. ::

    aws ecs deregister-container-instance \
        --cluster arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster \
        --container-instance arn:aws:ecs:us-west-2:123456789012:container-instance/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --force

Output::

    {
        "containerInstance": {
            "remainingResources": [
                {
                    "integerValue": 1024,
                    "doubleValue": 0.0,
                    "type": "INTEGER",
                    "longValue": 0,
                    "name": "CPU"
                },
                {
                    "integerValue": 985,
                    "doubleValue": 0.0,
                    "type": "INTEGER",
                    "longValue": 0,
                    "name": "MEMORY"
                },
                {
                    "type": "STRINGSET",
                    "integerValue": 0,
                    "name": "PORTS",
                    "stringSetValue": [
                        "22",
                        "2376",
                        "2375",
                        "51678",
                        "51679"
                    ],
                    "longValue": 0,
                    "doubleValue": 0.0
                },
                {
                    "type": "STRINGSET",
                    "integerValue": 0,
                    "name": "PORTS_UDP",
                    "stringSetValue": [],
                    "longValue": 0,
                    "doubleValue": 0.0
                }
            ],
            "agentConnected": true,
            "attributes": [
                {
                    "name": "ecs.capability.secrets.asm.environment-variables"
                },
                {
                    "name": "com.amazonaws.ecs.capability.logging-driver.syslog"
                },
                {
                    "value": "ami-01a82c3fce2c3ba58",
                    "name": "ecs.ami-id"
                },
                {
                    "name": "ecs.capability.secrets.asm.bootstrap.log-driver"
                },
                {
                    "name": "com.amazonaws.ecs.capability.logging-driver.none"
                },
                {
                    "name": "ecs.capability.ecr-endpoint"
                },
                {
                    "name": "com.amazonaws.ecs.capability.logging-driver.json-file"
                },
                {
                    "value": "vpc-1234567890123467",
                    "name": "ecs.vpc-id"
                },
                {
                    "name": "ecs.capability.execution-role-awslogs"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.17"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.18"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.19"
                },
                {
                    "name": "ecs.capability.docker-plugin.local"
                },
                {
                    "name": "ecs.capability.task-eni"
                },
                {
                    "name": "ecs.capability.task-cpu-mem-limit"
                },
                {
                    "name": "ecs.capability.secrets.ssm.bootstrap.log-driver"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.30"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.31"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.32"
                },
                {
                    "name": "ecs.capability.execution-role-ecr-pull"
                },
                {
                    "name": "ecs.capability.container-health-check"
                },
                {
                    "value": "subnet-1234567890123467",
                    "name": "ecs.subnet-id"
                },
                {
                    "value": "us-west-2a",
                    "name": "ecs.availability-zone"
                },
                {
                    "value": "t2.micro",
                    "name": "ecs.instance-type"
                },
                {
                    "name": "com.amazonaws.ecs.capability.task-iam-role-network-host"
                },
                {
                    "name": "ecs.capability.aws-appmesh"
                },
                {
                    "name": "com.amazonaws.ecs.capability.logging-driver.awslogs"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.24"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.25"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.26"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.27"
                },
                {
                    "name": "com.amazonaws.ecs.capability.privileged-container"
                },
                {
                    "name": "ecs.capability.container-ordering"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.28"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.29"
                },
                {
                    "value": "x86_64",
                    "name": "ecs.cpu-architecture"
                },
                {
                    "value": "93f43776-2018.10.0",
                    "name": "ecs.capability.cni-plugin-version"
                },
                {
                    "name": "ecs.capability.secrets.ssm.environment-variables"
                },
                {
                    "name": "ecs.capability.pid-ipc-namespace-sharing"
                },
                {
                    "name": "com.amazonaws.ecs.capability.ecr-auth"
                },
                {
                    "value": "linux",
                    "name": "ecs.os-type"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.20"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.21"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.22"
                },
                {
                    "name": "ecs.capability.task-eia"
                },
                {
                    "name": "ecs.capability.private-registry-authentication.secretsmanager"
                },
                {
                    "name": "com.amazonaws.ecs.capability.task-iam-role"
                },
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.23"
                }
            ],
            "pendingTasksCount": 0,
            "tags": [],
            "containerInstanceArn": "arn:aws:ecs:us-west-2:123456789012:container-instance/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "registeredResources": [
                {
                    "integerValue": 1024,
                    "doubleValue": 0.0,
                    "type": "INTEGER",
                    "longValue": 0,
                    "name": "CPU"
                },
                {
                    "integerValue": 985,
                    "doubleValue": 0.0,
                    "type": "INTEGER",
                    "longValue": 0,
                    "name": "MEMORY"
                },
                {
                    "type": "STRINGSET",
                    "integerValue": 0,
                    "name": "PORTS",
                    "stringSetValue": [
                        "22",
                        "2376",
                        "2375",
                        "51678",
                        "51679"
                    ],
                    "longValue": 0,
                    "doubleValue": 0.0
                },
                {
                    "type": "STRINGSET",
                    "integerValue": 0,
                    "name": "PORTS_UDP",
                    "stringSetValue": [],
                    "longValue": 0,
                    "doubleValue": 0.0
                }
            ],
            "status": "INACTIVE",
            "registeredAt": 1557768075.681,
            "version": 4,
            "versionInfo": {
                "agentVersion": "1.27.0",
                "agentHash": "aabe65ee",
                "dockerVersion": "DockerVersion: 18.06.1-ce"
            },
            "attachments": [],
            "runningTasksCount": 0,
            "ec2InstanceId": "i-12345678901234678"
        }
    }

For more information, see `Deregister a Container Instance <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deregister_container_instance.html>`_ in the *ECS Developer Guide*.