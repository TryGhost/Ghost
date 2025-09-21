**To update the state of a container instance**

The following ``update-container-instances-state`` updates the state of the specified container instance to ``DRAINING`` which will remove it from the cluster is it registered to. ::

    aws ecs update-container-instances-state \
        --container-instances 765936fadbdd46b5991a4bd70c2a43d4 \
        --status DRAINING

Output::

    {
        "containerInstances": [
            {
                "containerInstanceArn": "arn:aws:ecs:us-west-2:130757420319:container-instance/default/765936fadbdd46b5991a4bd70c2a43d4",
                "ec2InstanceId": "i-013d87ffbb4d513bf",
                "version": 4390,
                "versionInfo": {
                    "agentVersion": "1.29.0",
                    "agentHash": "a190a73f",
                    "dockerVersion": "DockerVersion:18.06.1-ce"
                },
                "remainingResources": [
                    {
                        "name": "CPU",
                        "type": "INTEGER",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 1536
                    },
                    {
                        "name": "MEMORY",
                        "type": "INTEGER",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 2681
                    },
                    {
                        "name": "PORTS",
                        "type": "STRINGSET",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 0,
                        "stringSetValue": [
                            "22",
                            "2376",
                            "2375",
                            "51678",
                            "51679"
                        ]
                    },
                    {
                        "name": "PORTS_UDP",
                        "type": "STRINGSET",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 0,
                        "stringSetValue": []
                    }
                ],
                "registeredResources": [
                    {
                        "name": "CPU",
                        "type": "INTEGER",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 2048
                    },
                    {
                        "name": "MEMORY",
                        "type": "INTEGER",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 3705
                    },
                    {
                        "name": "PORTS",
                        "type": "STRINGSET",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 0,
                        "stringSetValue": [
                            "22",
                            "2376",
                            "2375",
                            "51678",
                            "51679"
                        ]
                    },
                    {
                        "name": "PORTS_UDP",
                        "type": "STRINGSET",
                        "doubleValue": 0,
                        "longValue": 0,
                        "integerValue": 0,
                        "stringSetValue": []
                    }
                ],
                "status": "DRAINING",
                "agentConnected": true,
                "runningTasksCount": 2,
                "pendingTasksCount": 0,
                "attributes": [
                    {
                        "name": "ecs.capability.secrets.asm.environment-variables"
                    },
                    {
                        "name": "ecs.capability.branch-cni-plugin-version",
                        "value": "e0703516-"
                    },
                    {
                        "name": "ecs.ami-id",
                        "value": "ami-00e0090ac21971297"
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
                        "name": "ecs.capability.docker-plugin.local"
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
                        "name": "ecs.availability-zone",
                        "value": "us-west-2c"
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
                        "name": "ecs.capability.task-eni-trunking"
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
                        "name": "com.amazonaws.ecs.capability.docker-remote-api.1.28"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.privileged-container"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.docker-remote-api.1.29"
                    },
                    {
                        "name": "ecs.cpu-architecture",
                        "value": "x86_64"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.ecr-auth"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.docker-remote-api.1.20"
                    },
                    {
                        "name": "ecs.os-type",
                        "value": "linux"
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
                        "name": "com.amazonaws.ecs.capability.docker-remote-api.1.23"
                    },
                    {
                        "name": "ecs.capability.private-registry-authentication.secretsmanager"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.logging-driver.syslog"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.logging-driver.json-file"
                    },
                    {
                        "name": "ecs.capability.execution-role-awslogs"
                    },
                    {
                        "name": "ecs.vpc-id",
                        "value": "vpc-1234"
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
                        "name": "ecs.capability.task-eni"
                    },
                    {
                        "name": "ecs.capability.execution-role-ecr-pull"
                    },
                    {
                        "name": "ecs.capability.container-health-check"
                    },
                    {
                        "name": "ecs.subnet-id",
                        "value": "subnet-1234"
                    },
                    {
                        "name": "ecs.instance-type",
                        "value": "c5.large"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.task-iam-role-network-host"
                    },
                    {
                        "name": "ecs.capability.container-ordering"
                    },
                    {
                        "name": "ecs.capability.cni-plugin-version",
                        "value": "91ccefc8-2019.06.0"
                    },
                    {
                        "name": "ecs.capability.pid-ipc-namespace-sharing"
                    },
                    {
                        "name": "ecs.capability.secrets.ssm.environment-variables"
                    },
                    {
                        "name": "com.amazonaws.ecs.capability.task-iam-role"
                    }
                ],
                "registeredAt": 1560788724.507,
                "attachments": [],
                "tags": []
            }
        ],
        "failures": []
    }