**Example 1: To change the task definition used in a service**

The following ``update-service`` example updates the ``my-http-service`` service to use the ``amazon-ecs-sample`` task definition. ::

    aws ecs update-service \
        --cluster test \
        --service my-http-service \
        --task-definition amazon-ecs-sample

Output::

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/test/my-http-service",
            "serviceName": "my-http-service",
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/test",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 2,
            "runningCount": 2,
            "pendingCount": 0,
            "launchType": "FARGATE",
            "platformVersion": "1.4.0",
            "platformFamily": "Linux",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/amazon-ecs-sample:2",
            "deploymentConfiguration": {
                "deploymentCircuitBreaker": {
                    "enable": true,
                    "rollback": true
                },
                "maximumPercent": 200,
                "minimumHealthyPercent": 100,
                "alarms": {
                    "alarmNames": [],
                    "rollback": false,
                    "enable": false
                }
            },
            "deployments": [
                {
                    "id": "ecs-svc/7419115625193919142",
                    "status": "PRIMARY",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/amazon-ecs-sample:2",
                    "desiredCount": 0,
                    "pendingCount": 0,
                    "runningCount": 0,
                    "failedTasks": 0,
                    "createdAt": "2025-02-21T13:26:02.734000-06:00",
                    "updatedAt": "2025-02-21T13:26:02.734000-06:00",
                    "launchType": "FARGATE",
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-12344321"
                            ],
                            "securityGroups": [
                                "sg-12344321"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "IN_PROGRESS",
                    "rolloutStateReason": "ECS deployment ecs-svc/7419115625193919142 in progress."
                },
                {
                    "id": "ecs-svc/1709597507655421668",
                    "status": "ACTIVE",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/old-amazon-ecs-sample:4",
                    "desiredCount": 2,
                    "pendingCount": 0,
                    "runningCount": 2,
                    "failedTasks": 0,
                    "createdAt": "2025-01-24T11:13:07.621000-06:00",
                    "updatedAt": "2025-02-02T16:11:30.838000-06:00",
                    "launchType": "FARGATE",
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-12344321"
                            ],
                            "securityGroups": [
                                 "sg-12344321"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "COMPLETED",
                    "rolloutStateReason": "ECS deployment ecs-svc/1709597507655421668 completed."
                }
            ],
            "roleArn": "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "events": [
                {
                    "id": "e40b4d1c-80d9-4834-aaf3-6a268e530e17",
                    "createdAt": "2025-02-21T10:31:26.037000-06:00",
                    "message": "(my-http-service) has reached a steady state."
                },
                {
                    "id": "6ac069ad-fc8b-4e49-a35d-b5574a964c8e",
                    "createdAt": "2025-02-21T04:31:22.703000-06:00",
                    "message": "(my-http-service) has reached a steady state."
                },
                {
                    "id": "265f7d37-dfd1-4880-a846-ec486f341919",
                    "createdAt": "2025-02-20T22:31:22.514000-06:00",
                    "message": "(my-http-service) has reached a steady state."
                }
            ],
            "createdAt": "2024-10-30T17:12:43.218000-05:00",
            "placementConstraints": [],
            "placementStrategy": [],
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-12344321",
                    ],
                    "securityGroups": [
                        "sg-12344321"
                    ],
                    "assignPublicIp": "ENABLED"
                }
            },
            "healthCheckGracePeriodSeconds": 0,
            "schedulingStrategy": "REPLICA",
            "deploymentController": {
                "type": "ECS"
            },
            "createdBy": "arn:aws:iam::123456789012:role/AIDACKCEVSQ6C2EXAMPLE",
            "enableECSManagedTags": true,
            "propagateTags": "NONE",
            "enableExecuteCommand": false,
            "availabilityZoneRebalancing": "DISABLED"
        }
    }

For more information, see `Update an Amazon ECS service using the console <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service-console-v2.html>`__ in the *Amazon ECS Developer Guide*.

**Example 2: To change the number of tasks in a service**

The following ``update-service`` example updates the desired task count of the service ``my-http-service`` from to 2. ::

    aws ecs update-service \
        --cluster MyCluster \
        --service my-http-service \
        --desired-count 2

Output::

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-east-1:123456789012:service/MyCluster/my-http-service",
            "serviceName": "my-http-service",
            "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/MyCluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 2,
            "runningCount": 1,
            "pendingCount": 0,
            "capacityProviderStrategy": [
                {
                    "capacityProvider": "FARGATE",
                    "weight": 1,
                    "base": 0
                }
            ],
            "platformVersion": "LATEST",
            "platformFamily": "Linux",
            "taskDefinition": "arn:aws:ecs:us-east-1:123456789012:task-definition/MyTaskDefinition",
            "deploymentConfiguration": {
                "deploymentCircuitBreaker": {
                    "enable": true,
                    "rollback": true
                },
                "maximumPercent": 200,
                "minimumHealthyPercent": 100,
                "alarms": {
                    "alarmNames": [],
                    "rollback": false,
                    "enable": false
                }
            },
            "deployments": [
                {
                    "id": "ecs-svc/1976744184940610707",
                    "status": "PRIMARY",
                    "taskkDefinition": "arn:aws:ecs:us-east-1:123456789012:task-definition/MyTaskDefinition",
                    "desiredCount": 1,
                    "pendingCount": 0,
                    "runningCount": 1,
                    "failedTasks": 0,
                    "createdAt": "2024-12-03T16:24:25.225000-05:00",
                    "updatedAt": "2024-12-03T16:25:15.837000-05:00",
                    "capacityProviderStrategy": [
                        {
                            "capacityProvider": "FARGATE",
                            "weight": 1,
                            "base": 0
                        }
                    ],
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-0d0eab1bb38d5ca64",
                                "subnet-0db5010045995c2d5"
                            ],
                            "securityGroups": [
                                "sg-02556bf85a191f59a"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "COMPLETED",
                    "rolloutStateReason": "ECS deployment ecs-svc/1976744184940610707 completed."
                }
            ],
            "roleArn": "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "events": [
                {
                    "id": "f27350b9-4b2a-4e2e-b72e-a4b68380de45",
                    "createdAt": "2024-12-30T13:24:07.345000-05:00",
                    "message": "(service my-http-service) has reached a steady state."
                },
                {
                    "id": "e764ec63-f53f-45e3-9af2-d99f922d2957",
                    "createdAt": "2024-12-30T12:32:21.600000-05:00",
                    "message": "(service my-http-service) has reached a steady state."
                },          
                {
                    "id": "28444756-c2fa-47f8-bd60-93a8e05f3991",
                    "createdAt": "2024-12-08T19:26:10.367000-05:00",
                    "message": "(service my-http-service) has reached a steady state."
                }
            ],
            "createdAt": "2024-12-03T16:24:25.225000-05:00",
            "placementConstraints": [],
            "placementStrategy": [],
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-0d0eab1bb38d5ca64",
                        "subnet-0db5010045995c2d5"
                    ],
                    "securityGroups": [
                        "sg-02556bf85a191f59a"
                    ],
                    "assignPublicIp": "ENABLED"
                }
            },
            "healthCheckGracePeriodSeconds": 0,
            "schedulingStrategy": "REPLICA",
            "deploymentController": {
                "type": "ECS"
            },
            "createdBy": "arn:aws:iam::123456789012:role/Admin",
            "enableECSManagedTags": true,
            "propagateTags": "NONE",
            "enableExecuteCommand": false,
            "availabilityZoneRebalancing": "ENABLED"
        }
    }

For more information, see `Updating an Amazon ECS service using the console <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service-console-v2.html>`__ in the *Amazon ECS Developer Guide*.

**Example 3: To configure Amazon EBS volumes for attachment at service update**

The following ``update-service`` example updates the service ``my-http-service`` to use Amazon EBS volumes. You must have an Amazon ECS infrastructure role configured with the ``AmazonECSInfrastructureRolePolicyForVolumes`` managed policy attached. You must also specify a task definition with the same volume name as in the ``update-service`` request and with ``configuredAtLaunch`` set to ``true``. This example uses the ``--cli-input-json`` option and a JSON input file called ``ebs.json``. ::

    aws ecs update-service \
        --cli-input-json file://ebs.json

Contents of ``ebs.json``::

    {
       "cluster": "mycluster",
       "taskDefinition": "mytaskdef",
       "service": "my-http-service",
       "desiredCount": 2,
       "volumeConfigurations": [
            {
                "name": "myEbsVolume",
                "managedEBSVolume": {
                    "roleArn":"arn:aws:iam::123456789012:role/ecsInfrastructureRole",
                    "volumeType": "gp3",
                    "sizeInGiB": 100,
                    "iops": 3000, 
                    "throughput": 125, 
                    "filesystemType": "ext4"
                }
            }
       ]
    }

Output:: 

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/mycluster/my-http-service",
            "serviceName": "my-http-service",
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/mycluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 2,
            "runningCount": 2,
            "pendingCount": 0,
            "launchType": "FARGATE",
            "platformVersion": "LATEST",
            "platformFamily": "Linux",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:1",
            "deploymentConfiguration": {
                "deploymentCircuitBreaker": {
                    "enable": true,
                    "rollback": true
                },
                "maximumPercent": 200,
                "minimumHealthyPercent": 100,
                "alarms": {
                    "alarmNames": [],
                    "rollback": false,
                    "enable": false
                }
            },
            "deployments": [
                {
                    "id": "ecs-svc/2420458347226626275",
                    "status": "PRIMARY",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:1",
                    "desiredCount": 0,
                    "pendingCount": 0,
                    "runningCount": 0,
                    "failedTasks": 0,
                    "createdAt": "2025-02-21T15:07:20.519000-06:00",
                    "updatedAt": "2025-02-21T15:07:20.519000-06:00",
                    "launchType": "FARGATE",
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-12344321",
                            ],
                            "securityGroups": [
                                "sg-12344321"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "IN_PROGRESS",
                    "rolloutStateReason": "ECS deployment ecs-svc/2420458347226626275 in progress.",
                    "volumeConfigurations": [
                        {
                            "name": "ebs-volume",
                            "managedEBSVolume": {
                                "volumeType": "gp3",
                                "sizeInGiB": 100,
                                "iops": 3000,
                                "throughput": 125,
                                "roleArn": "arn:aws:iam::123456789012:role/ecsInfrastructureRole",
                                "filesystemType": "ext4"
                            }
                        }  
                    ]
                },
                {
                    "id": "ecs-svc/5191625155316533644",
                    "status": "ACTIVE",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:2",
                    "desiredCount": 2,
                    "pendingCount": 0,
                    "runningCount": 2,
                    "failedTasks": 0,
                    "createdAt": "2025-02-21T14:54:48.862000-06:00",
                    "updatedAt": "2025-02-21T14:57:22.502000-06:00",
                    "launchType": "FARGATE",
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-12344321"
                            ],
                            "securityGroups": [
                                "sg-12344321"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "COMPLETED",
                    "rolloutStateReason": "ECS deployment ecs-svc/5191625155316533644 completed."
                }
            ],
            "roleArn": "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "events": [
                {
                    "id": "b5823113-c2c5-458e-9649-8c2ed38f23a5",
                    "createdAt": "2025-02-21T14:57:22.508000-06:00",
                    "message": "(service my-http-service) has reached a steady state."
                },
                {
                    "id": "b05a48e8-da35-4074-80aa-37ceb3167357",
                    "createdAt": "2025-02-21T14:57:22.507000-06:00",
                    "message": "(service my-http-service) (deployment ecs-svc/5191625155316533644) deployment completed."
                },
                {
                    "id": "a10cd55d-4ba6-4cea-a655-5a5d32ada8a0",
                    "createdAt": "2025-02-21T14:55:32.833000-06:00",
                    "message": "(service my-http-service) has started 1 tasks: (task fb9c8df512684aec92f3c57dc3f22361)."
                },
            ],
            "createdAt": "2025-02-21T14:54:48.862000-06:00",
            "placementConstraints": [],
            "placementStrategy": [],
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-12344321"
                    ],
                    "securityGroups": [
                        "sg-12344321"
                    ],
                    "assignPublicIp": "ENABLED"
                }
            },
            "healthCheckGracePeriodSeconds": 0,
            "schedulingStrategy": "REPLICA",
            "deploymentController": {
                "type": "ECS"
            },
            "createdBy": "arn:aws:iam::123456789012:role/AIDACKCEVSQ6C2EXAMPLE",
            "enableECSManagedTags": true,
            "propagateTags": "NONE",
            "enableExecuteCommand": false,
            "availabilityZoneRebalancing": "ENABLED"
        }
    }


For more information, see `Use Amazon EBS volumes with Amazon ECS <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-volumes.html>`__ in the *Amazon ECS Developer Guide*.
   
**Example 4: To update a service to no longer use Amazon EBS volumes**

The following ``update-service`` example updates the service ``my-http-service`` to no longer use Amazon EBS volumes. You must specify a task definition revision with ``configuredAtLaunch`` set to ``false``. ::
    
    aws ecs update-service \
        --cluster mycluster \
        --task-definition mytaskdef \
        --service my-http-service \
        --desired-count 2 \
        --volume-configurations "[]"

Output::

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/mycluster/my-http-service",
            "serviceName": "my-http-service",
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/mycluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 2,
            "runningCount": 2,
            "pendingCount": 0,
            "launchType": "FARGATE",
            "platformVersion": "LATEST",
            "platformFamily": "Linux",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:3",
            "deploymentConfiguration": {
                "deploymentCircuitBreaker": {
                    "enable": true,
                    "rollback": true
                },
                "maximumPercent": 200,
                "minimumHealthyPercent": 100,
                "alarms": {
                    "alarmNames": [],
                    "rollback": false,
                    "enable": false
                }
            },
            "deployments": [
                {
                    "id": "ecs-svc/7522791612543716777",
                    "status": "PRIMARY",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:3",
                    "desiredCount": 0,
                    "pendingCount": 0,
                    "runningCount": 0,
                    "failedTasks": 0,
                    "createdAt": "2025-02-21T15:25:38.598000-06:00",
                    "updatedAt": "2025-02-21T15:25:38.598000-06:00",
                        "launchType": "FARGATE",
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-12344321"
                            ],
                            "securityGroups": [
                                "sg-12344321"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "IN_PROGRESS",
                    "rolloutStateReason": "ECS deployment ecs-svc/7522791612543716777 in progress."
                },
                {
                    "id": "ecs-svc/2420458347226626275",
                    "status": "ACTIVE",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/myoldtaskdef:1",
                    "desiredCount": 2,
                    "pendingCount": 0,
                    "runningCount": 2,
                    "failedTasks": 0,
                    "createdAt": "2025-02-21T15:07:20.519000-06:00",
                    "updatedAt": "2025-02-21T15:10:59.955000-06:00",
                    "launchType": "FARGATE",
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-12344321"
                            ],
                            "securityGroups": [
                                "sg-12344321"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "COMPLETED",
                    "rolloutStateReason": "ECS deployment ecs-svc/2420458347226626275 completed.",
                    "volumeConfigurations": [
                        {
                            "name": "ebs-volume",
                            "managedEBSVolume": {
                                "volumeType": "gp3",
                                "sizeInGiB": 100,
                                "iops": 3000,
                                "throughput": 125,
                                "roleArn": "arn:aws:iam::123456789012:role/ecsInfrastructureRole",
                                "filesystemType": "ext4"
                            }
                        }
                    ]
                }
            ],
            "roleArn": "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "events": [
                {
                    "id": "4f2c3ca1-7800-4048-ba57-bba210ada2ad",
                    "createdAt": "2025-02-21T15:10:59.959000-06:00",
                    "message": "(service my-http-service) has reached a steady state."
                },
                {
                    "id": "4b36a593-2d40-4ed6-8be8-b9b699eb6198",
                    "createdAt": "2025-02-21T15:10:59.958000-06:00",
                    "message": "(service my-http-service) (deployment ecs-svc/2420458347226626275) deployment completed."
                },
                {
                    "id": "88380089-14e2-4ef0-8dbb-a33991683371",
                    "createdAt": "2025-02-21T15:09:39.055000-06:00",
                    "message": "(service my-http-service) has stopped 1 running tasks: (task fb9c8df512684aec92f3c57dc3f22361)."
                },
                {
                    "id": "97d84243-d52f-4255-89bb-9311391c61f6",
                    "createdAt": "2025-02-21T15:08:57.653000-06:00",
                    "message": "(service my-http-service) has stopped 1 running tasks: (task 33eff090ad2c40539daa837e6503a9bc)."
                },
                {
                    "id": "672ece6c-e2d0-4021-b5da-eefb14001687",
                    "createdAt": "2025-02-21T15:08:15.631000-06:00",
                    "message": "(service my-http-service) has started 1 tasks: (task 996c02a66ff24f3190a4a8e0c841740f)."
                },
                {
                    "id": "a3cf9bea-9be6-4175-ac28-4c68360986eb",
                    "createdAt": "2025-02-21T15:07:36.931000-06:00",
                    "message": "(service my-http-service) has started 1 tasks: (task d5d23c39f89e46cf9a647b9cc6572feb)."
                },
                {
                    "id": "b5823113-c2c5-458e-9649-8c2ed38f23a5",
                    "createdAt": "2025-02-21T14:57:22.508000-06:00",
                    "message": "(service my-http-service) has reached a steady state."
                },
                {
                    "id": "b05a48e8-da35-4074-80aa-37ceb3167357",
                    "createdAt": "2025-02-21T14:57:22.507000-06:00",
                    "message": "(service my-http-service) (deployment ecs-svc/5191625155316533644) deployment completed."
                },
                {
                    "id": "a10cd55d-4ba6-4cea-a655-5a5d32ada8a0",
                    "createdAt": "2025-02-21T14:55:32.833000-06:00",
                    "message": "(service my-http-service) has started 1 tasks: (task fb9c8df512684aec92f3c57dc3f22361)."
                },
                {
                    "id": "42da91fa-e26d-42ef-88c3-bb5965c56b2f",
                    "createdAt": "2025-02-21T14:55:02.703000-06:00",
                    "message": "(service my-http-service) has started 1 tasks: (task 33eff090ad2c40539daa837e6503a9bc)."
                }
            ],
            "createdAt": "2025-02-21T14:54:48.862000-06:00",
            "placementConstraints": [],
            "placementStrategy": [],
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-12344321"
                    ],
                    "securityGroups": [
                        "sg-12344321"
                    ],
                    "assignPublicIp": "ENABLED"
                }
            },
            "healthCheckGracePeriodSeconds": 0,
            "schedulingStrategy": "REPLICA",
            "deploymentController": {
                "type": "ECS"
            },
            "createdBy": "arn:aws:iam::123456789012:role/AIDACKCEVSQ6C2EXAMPLE",
            "enableECSManagedTags": true,
            "propagateTags": "NONE",
            "enableExecuteCommand": false,
            "availabilityZoneRebalancing": "ENABLED"
        }
    }

For more information, see `Use Amazon EBS volumes with Amazon ECS <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-volumes.html>`__ in the *Amazon ECS Developer Guide*.

**Example 5: To turn on Availability Zone rebalancing for a service**

The following ``update-service`` example turns on Availability Zone rebalancing for the service ``my-http-service``. ::

    aws ecs update-service \
        --cluster MyCluster \
        --service my-http-service \
        --availability-zone-rebalancing ENABLED

Output::

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-east-1:123456789012:service/MyCluster/my-http-service",
            "serviceName": "my-http-service",
            "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/MyCluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 2,
            "runningCount": 1,
            "pendingCount": 0,
            "capacityProviderStrategy": [
                {
                    "capacityProvider": "FARGATE",
                    "weight": 1,
                    "base": 0
                }
            ],
            "platformVersion": "LATEST",
            "platformFamily": "Linux",
            "taskDefinition": "arn:aws:ecs:us-east-1:123456789012:task-definition/MyTaskDefinition",
            "deploymentConfiguration": {
                "deploymentCircuitBreaker": {
                    "enable": true,
                    "rollback": true
                },
                "maximumPercent": 200,
                "minimumHealthyPercent": 100,
                "alarms": {
                    "alarmNames": [],
                    "rollback": false,
                    "enable": false
                }
            },
            "deployments": [
                {
                    "id": "ecs-svc/1976744184940610707",
                    "status": "PRIMARY",
                    "taskkDefinition": "arn:aws:ecs:us-east-1:123456789012:task-definition/MyTaskDefinition",
                    "desiredCount": 1,
                    "pendingCount": 0,
                    "runningCount": 1,
                    "failedTasks": 0,
                    "createdAt": "2024-12-03T16:24:25.225000-05:00",
                    "updatedAt": "2024-12-03T16:25:15.837000-05:00",
                    "capacityProviderStrategy": [
                        {
                            "capacityProvider": "FARGATE",
                            "weight": 1,
                            "base": 0
                        }
                    ],
                    "platformVersion": "1.4.0",
                    "platformFamily": "Linux",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-0d0eab1bb38d5ca64",
                                "subnet-0db5010045995c2d5"
                            ],
                            "securityGroups": [
                                "sg-02556bf85a191f59a"
                            ],
                            "assignPublicIp": "ENABLED"
                        }
                    },
                    "rolloutState": "COMPLETED",
                    "rolloutStateReason": "ECS deployment ecs-svc/1976744184940610707 completed."
                }
            ],
            "roleArn": "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "events": [],
            "createdAt": "2024-12-03T16:24:25.225000-05:00",
            "placementConstraints": [],
            "placementStrategy": [],
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-0d0eab1bb38d5ca64",
                        "subnet-0db5010045995c2d5"
                    ],
                    "securityGroups": [
                        "sg-02556bf85a191f59a"
                    ],
                    "assignPublicIp": "ENABLED"
                }
            },
            "healthCheckGracePeriodSeconds": 0,
            "schedulingStrategy": "REPLICA",
            "deploymentController": {
                "type": "ECS"
            },
            "createdBy": "arn:aws:iam::123456789012:role/Admin",
            "enableECSManagedTags": true,
            "propagateTags": "NONE",
            "enableExecuteCommand": false,
            "availabilityZoneRebalancing": "ENABLED"
        }
    }

For more information, see `Updating an Amazon ECS service using the console <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service-console-v2.html>`__ in the *Amazon ECS Developer Guide*.
