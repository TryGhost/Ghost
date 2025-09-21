**Exampe 1: To describe a single task tasks**

The following ``describe-tasks`` example retrieves the details of a task in a cluster. You can specify the task by using either the ID or full ARN of the task. This example uses the full ARN of the task. ::

    aws ecs describe-tasks \
        --cluster MyCluster \
        --tasks arn:aws:ecs:us-east-1:123456789012:task/MyCluster/4d590253bb114126b7afa7b58EXAMPLE

Output::

    {
        "tasks": [
            {
                "attachments": [],
                "attributes": [
                    {
                        "name": "ecs.cpu-architecture",
                        "value": "x86_64"
                    }
                ],
                "availabilityZone": "us-east-1b",
                "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/MyCluster",
                "connectivity": "CONNECTED",
                "connectivityAt": "2021-08-11T12:21:26.681000-04:00",
                "containerInstanceArn": "arn:aws:ecs:us-east-1:123456789012:container-instance/test/025c7e2c5e054a6790a29fc1fEXAMPLE",
                "containers": [
                    {
                        "containerArn": "arn:aws:ecs:us-east-1:123456789012:container/MyCluster/4d590253bb114126b7afa7b58eea9221/a992d1cc-ea46-474a-b6e8-24688EXAMPLE",
                        "taskArn": "arn:aws:ecs:us-east-1:123456789012:task/MyCluster/4d590253bb114126b7afa7b58EXAMPLE",
                        "name": "simple-app",
                        "image": "httpd:2.4",
                        "runtimeId": "91251eed27db90006ad67b1a08187290869f216557717dd5c39b37c94EXAMPLE",
                        "lastStatus": "RUNNING",
                        "networkBindings": [
                            {
                                "bindIP": "0.0.0.0",
                                "containerPort": 80,
                                "hostPort": 80,
                                "protocol": "tcp"
                            }
                        ],
                        "networkInterfaces": [],
                        "healthStatus": "UNKNOWN",
                        "cpu": "10",
                        "memory": "300"
                    }
                ],
                "cpu": "10",
                "createdAt": "2021-08-11T12:21:26.681000-04:00",
                "desiredStatus": "RUNNING",
                "enableExecuteCommand": false,
                "group": "service:testupdate",
                "healthStatus": "UNKNOWN",
                "lastStatus": "RUNNING",
                "launchType": "EC2",
                "memory": "300",
                "overrides": {
                    "containerOverrides": [
                        {
                            "name": "simple-app"
                        }
                    ],
                    "inferenceAcceleratorOverrides": []
                },
                "pullStartedAt": "2021-08-11T12:21:28.234000-04:00",
                "pullStoppedAt": "2021-08-11T12:21:33.793000-04:00",
                "startedAt": "2021-08-11T12:21:34.945000-04:00",
                "startedBy": "ecs-svc/968695068243EXAMPLE",
                "tags": [],
                "taskArn": "arn:aws:ecs:us-east-1:123456789012:task/MyCluster/4d590253bb114126b7afa7b58eea9221",
                "taskDefinitionArn": "arn:aws:ecs:us-east-1:123456789012:task-definition/console-sample-app-static2:1",
                "version": 2
            }
        ],
        "failures": []
    }

For more information, see `Amazon ECS Task Definitions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html>`__ in the *Amazon ECS Developer Guide*.

**Exampe 2: To describe multiple tasks**

The following ``describe-tasks`` example retrieves the details of multiple tasks in a cluster. You can specify the task by using either the ID or full ARN of the task. This example uses the full IDs of the tasks. ::

    aws ecs describe-tasks \
        --cluster MyCluster \
        --tasks "74de0355a10a4f979ac495c14EXAMPLE" "d789e94343414c25b9f6bd59eEXAMPLE"

Output::

    {
        "tasks": [
            {
                "attachments": [
                    {
                        "id": "d9e7735a-16aa-4128-bc7a-b2d51EXAMPLE",
                        "type": "ElasticNetworkInterface",
                        "status": "ATTACHED",
                        "details": [
                            {
                                "name": "subnetId",
                                "value": "subnet-0d0eab1bb3EXAMPLE"
                            },
                            {
                                "name": "networkInterfaceId",
                                "value": "eni-0fa40520aeEXAMPLE"
                            },
                            {
                                "name": "macAddress",
                                "value": "0e:89:76:28:07:b3"
                            },
                            {
                                "name": "privateDnsName",
                                "value": "ip-10-0-1-184.ec2.internal"
                            },
                            {
                                "name": "privateIPv4Address",
                                "value": "10.0.1.184"
                            }
                        ]
                    }
                ],
                "attributes": [
                    {
                        "name": "ecs.cpu-architecture",
                        "value": "x86_64"
                    }
                ],
                "availabilityZone": "us-east-1b",
                "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/MyCluster",
                "connectivity": "CONNECTED",
                "connectivityAt": "2021-12-20T12:13:37.875000-05:00",
                "containers": [
                    {
                        "containerArn": "arn:aws:ecs:us-east-1:123456789012:container/MyCluster/74de0355a10a4f979ac495c14EXAMPLE/aad3ba00-83b3-4dac-84d4-11f8cEXAMPLE",
                        "taskArn": "arn:aws:ecs:us-east-1:123456789012:task/MyCluster/74de0355a10a4f979ac495c14EXAMPLE",
                        "name": "web",
                        "image": "nginx",
                        "runtimeId": "74de0355a10a4f979ac495c14EXAMPLE-265927825",
                        "lastStatus": "RUNNING",
                        "networkBindings": [],
                        "networkInterfaces": [
                            {
                                "attachmentId": "d9e7735a-16aa-4128-bc7a-b2d51EXAMPLE",
                                "privateIpv4Address": "10.0.1.184"
                            }
                        ],
                        "healthStatus": "UNKNOWN",
                        "cpu": "99",
                        "memory": "100"
                    }
                ],
                "cpu": "256",
                "createdAt": "2021-12-20T12:13:20.226000-05:00",
                "desiredStatus": "RUNNING",
                "enableExecuteCommand": false,
                "group": "service:tdsevicetag",
                "healthStatus": "UNKNOWN",
                "lastStatus": "RUNNING",
                "launchType": "FARGATE",
                "memory": "512",
                "overrides": {
                    "containerOverrides": [
                        {
                            "name": "web"
                        }
                    ],
                    "inferenceAcceleratorOverrides": []
                },
                "platformVersion": "1.4.0",
                "platformFamily": "Linux",
                "pullStartedAt": "2021-12-20T12:13:42.665000-05:00",
                "pullStoppedAt": "2021-12-20T12:13:46.543000-05:00",
                "startedAt": "2021-12-20T12:13:48.086000-05:00",
                "startedBy": "ecs-svc/988401040018EXAMPLE",
                "tags": [],
                "taskArn": "arn:aws:ecs:us-east-1:123456789012:task/MyCluster/74de0355a10a4f979ac495c14EXAMPLE",
                "taskDefinitionArn": "arn:aws:ecs:us-east-1:123456789012:task-definition/webserver:2",
                "version": 3,
                "ephemeralStorage": {
                "sizeInGiB": 20
                }
            },
            {
                "attachments": [
                    {
                        "id": "214eb5a9-45cd-4bf8-87bc-57fefEXAMPLE",
                        "type": "ElasticNetworkInterface",
                        "status": "ATTACHED",
                        "details": [
                            {
                                "name": "subnetId",
                                "value": "subnet-0d0eab1bb3EXAMPLE"
                            },
                            {
                                "name": "networkInterfaceId",
                                "value": "eni-064c7766daEXAMPLE"
                            },
                            {
                                "name": "macAddress",
                                "value": "0e:76:83:01:17:a9"
                            },
                            {
                                "name": "privateDnsName",
                                "value": "ip-10-0-1-41.ec2.internal"
                            },
                            {
                                "name": "privateIPv4Address",
                                "value": "10.0.1.41"
                            }
                        ]
                    }
                ],
                "attributes": [
                    {
                        "name": "ecs.cpu-architecture",
                        "value": "x86_64"
                    }
                ],
                "availabilityZone": "us-east-1b",
                "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/MyCluster",
                "connectivity": "CONNECTED",
                "connectivityAt": "2021-12-20T12:13:35.243000-05:00",
                "containers": [
                    {
                        "containerArn": "arn:aws:ecs:us-east-1:123456789012:container/MyCluster/d789e94343414c25b9f6bd59eEXAMPLE/9afef792-609b-43a5-bb6a-3efdbEXAMPLE",
                        "taskArn": "arn:aws:ecs:us-east-1:123456789012:task/MyCluster/d789e94343414c25b9f6bd59eEXAMPLE",
                        "name": "web",
                        "image": "nginx",
                        "runtimeId": "d789e94343414c25b9f6bd59eEXAMPLE-265927825",
                        "lastStatus": "RUNNING",
                        "networkBindings": [],
                        "networkInterfaces": [
                            {
                                "attachmentId": "214eb5a9-45cd-4bf8-87bc-57fefEXAMPLE",
                                "privateIpv4Address": "10.0.1.41"
                            }
                        ],
                        "healthStatus": "UNKNOWN",
                        "cpu": "99",
                        "memory": "100"
                    }
                ],
                "cpu": "256",
                "createdAt": "2021-12-20T12:13:20.226000-05:00",
                "desiredStatus": "RUNNING",
                "enableExecuteCommand": false,
                "group": "service:tdsevicetag",
                "healthStatus": "UNKNOWN",
                "lastStatus": "RUNNING",
                "launchType": "FARGATE",
                "memory": "512",
                "overrides": {
                    "containerOverrides": [
                        {
                            "name": "web"
                        }
                    ],
                    "inferenceAcceleratorOverrides": []
                },
                "platformVersion": "1.4.0",
                "platformFamily": "Linux",
                "pullStartedAt": "2021-12-20T12:13:44.611000-05:00",
                "pullStoppedAt": "2021-12-20T12:13:48.251000-05:00",
                "startedAt": "2021-12-20T12:13:49.326000-05:00",
                "startedBy": "ecs-svc/988401040018EXAMPLE",
                "tags": [],
                "taskArn": "arn:aws:ecs:us-east-1:123456789012:task/MyCluster/d789e94343414c25b9f6bd59eEXAMPLE",
                "taskDefinitionArn": "arn:aws:ecs:us-east-1:123456789012:task-definition/webserver:2",
                "version": 3,
                "ephemeralStorage": {
                    "sizeInGiB": 20
                }
            }
        ],
        "failures": []
    }

For more information, see `Amazon ECS Task Definitions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html>`__ in the *Amazon ECS Developer Guide*.