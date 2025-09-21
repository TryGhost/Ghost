**Example 1: To create a service with a Fargate task**

The following ``create-service`` example shows how to create a service using a Fargate task. ::

    aws ecs create-service \
        --cluster MyCluster \
        --service-name MyService \
        --task-definition sample-fargate:1 \
        --desired-count 2 \
        --launch-type FARGATE \
        --platform-version LATEST \
        --network-configuration 'awsvpcConfiguration={subnets=[subnet-12344321],securityGroups=[sg-12344321],assignPublicIp=ENABLED}' \
        --tags key=key1,value=value1 key=key2,value=value2 key=key3,value=value3

Output::

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/MyCluster/MyService",
            "serviceName": "MyService",
              "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 2,
            "runningCount": 0,
            "pendingCount": 0,
            "launchType": "FARGATE",
            "platformVersion": "LATEST",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/sample-fargate:1",
            "deploymentConfiguration": {
                "maximumPercent": 200,
                "minimumHealthyPercent": 100
            },
            "deployments": [
                {
                    "id": "ecs-svc/1234567890123456789",
                    "status": "PRIMARY",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/sample-fargate:1",
                    "desiredCount": 2,
                    "pendingCount": 0,
                    "runningCount": 0,
                    "createdAt": 1557119253.821,
                    "updatedAt": 1557119253.821,
                    "launchType": "FARGATE",
                    "platformVersion": "1.3.0",
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
                    }
                }
            ],
            "roleArn": "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "events": [],
            "createdAt": 1557119253.821,
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
            "schedulingStrategy": "REPLICA",
            "tags": [
                {
                    "key": "key1",
                    "value": "value1"
                },
                {
                    "key": "key2",
                    "value": "value2"
                },
                {
                    "key": "key3",
                    "value": "value3"
                }
            ],
            "enableECSManagedTags": false,
            "propagateTags": "NONE"
        }
    }

For more information, see `Creating a Service <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-console-v2.html>`__ in the *Amazon ECS Developer Guide*.

**Example 2: To create a service using the EC2 launch type**

The following ``create-service`` example shows how to create a service called ``ecs-simple-service`` with a task that uses the EC2 launch type. The service uses the ``sleep360`` task definition and it maintains 1 instantiation of the task. ::

    aws ecs create-service \
        --cluster MyCluster \
        --service-name ecs-simple-service \
        --task-definition sleep360:2 \
        --desired-count 1

Output::

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/MyCluster/ecs-simple-service",
            "serviceName": "ecs-simple-service",
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 1,
            "runningCount": 0,
            "pendingCount": 0,
            "launchType": "EC2",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/sleep360:2",
            "deploymentConfiguration": {
                "maximumPercent": 200,
                "minimumHealthyPercent": 100
            },
            "deployments": [
                {
                    "id": "ecs-svc/1234567890123456789",
                    "status": "PRIMARY",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/sleep360:2",
                    "desiredCount": 1,
                    "pendingCount": 0,
                    "runningCount": 0,
                    "createdAt": 1557206498.798,
                    "updatedAt": 1557206498.798,
                    "launchType": "EC2"
                }
            ],
            "events": [],
            "createdAt": 1557206498.798,
            "placementConstraints": [],
            "placementStrategy": [],
            "schedulingStrategy": "REPLICA",
            "enableECSManagedTags": false,
            "propagateTags": "NONE"
        }
    }

For more information, see `Creating a Service <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-console-v2.html>`__ in the *Amazon ECS Developer Guide*.

**Example 3: To create a service that uses an external deployment controller**

The following ``create-service`` example creates a service that uses an external deployment controller. ::

    aws ecs create-service \
        --cluster MyCluster \
        --service-name MyService \
        --deployment-controller type=EXTERNAL \
        --desired-count 1

Output::

    {
        "service": {
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/MyCluster/MyService",
            "serviceName": "MyService",
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 1,
            "runningCount": 0,
            "pendingCount": 0,
            "launchType": "EC2",
            "deploymentConfiguration": {
                "maximumPercent": 200,
                "minimumHealthyPercent": 100
            },
            "taskSets": [],
            "deployments": [],
            "roleArn": "arn:aws:iam::123456789012:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "events": [],
            "createdAt": 1557128207.101,
            "placementConstraints": [],
            "placementStrategy": [],
            "schedulingStrategy": "REPLICA",
            "deploymentController": {
                "type": "EXTERNAL"
            },
            "enableECSManagedTags": false,
            "propagateTags": "NONE"
        }
    }

For more information, see `Creating a Service <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-console-v2.html>`__ in the *Amazon ECS Developer Guide*.

**Example 4: To create a new service behind a load balancer**

The following ``create-service`` example shows how to create a service that is behind a load balancer. You must have a load balancer configured in the same Region as your container instance. This example uses the ``--cli-input-json`` option and a JSON input file called ``ecs-simple-service-elb.json`` with the following content. ::

    aws ecs create-service \
        --cluster MyCluster \
        --service-name ecs-simple-service-elb \
        --cli-input-json file://ecs-simple-service-elb.json

Contents of ``ecs-simple-service-elb.json``::

     {
        "serviceName": "ecs-simple-service-elb",
        "taskDefinition": "ecs-demo",
        "loadBalancers": [
            {
                "loadBalancerName": "EC2Contai-EcsElast-123456789012",
                "containerName": "simple-demo",
                "containerPort": 80
            }
        ],
        "desiredCount": 10,
        "role": "ecsServiceRole"
    }

Output::

    {
        "service": {
            "status": "ACTIVE",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/ecs-demo:1",
            "pendingCount": 0,
            "loadBalancers": [
                {
                    "containerName": "ecs-demo",
                    "containerPort": 80,
                    "loadBalancerName": "EC2Contai-EcsElast-123456789012"
                }
            ],
            "roleArn": "arn:aws:iam::123456789012:role/ecsServiceRole",
            "desiredCount": 10,
            "serviceName": "ecs-simple-service-elb",
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/MyCluster",
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/ecs-simple-service-elb",
            "deployments": [
                {
                    "status": "PRIMARY",
                    "pendingCount": 0,
                    "createdAt": 1428100239.123,
                    "desiredCount": 10,
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/ecs-demo:1",
                    "updatedAt": 1428100239.123,
                    "id": "ecs-svc/1234567890123456789",
                    "runningCount": 0
                }
            ],
            "events": [],
            "runningCount": 0
        }
    }

For more information, see `Use load balancing to distribute Amazon ECS service traffic <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html>`__ in the *Amazon ECS Developer Guide*.

**Example 5: To configure Amazon EBS volumes at service creation**

The following ``create-service`` example shows how to configure Amazon EBS volumes for each task managed by the service. You must have an Amazon ECS infrastructure role configured with the ``AmazonECSInfrastructureRolePolicyForVolumes`` managed policy attached. You must specify a task definition with the same volume name as in the ``create-service`` request. This example uses the ``--cli-input-json`` option and a JSON input file called ``ecs-simple-service-ebs.json`` with the following content. ::

    aws ecs create-service \
        --cli-input-json file://ecs-simple-service-ebs.json

Contents of ``ecs-simple-service-ebs.json``::

    {
        "cluster": "mycluster",
        "taskDefinition": "mytaskdef",
        "serviceName": "ecs-simple-service-ebs",
        "desiredCount": 2,
        "launchType": "FARGATE",
        "networkConfiguration":{
            "awsvpcConfiguration":{
                "assignPublicIp": "ENABLED",
                "securityGroups": ["sg-12344321"],
                "subnets":["subnet-12344321"]
            }
        },
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
            "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/mycluster/ecs-simple-service-ebs",
            "serviceName": "ecs-simple-service-ebs",
            "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/mycluster",
            "loadBalancers": [],
            "serviceRegistries": [],
            "status": "ACTIVE",
            "desiredCount": 2,
            "runningCount": 0,
            "pendingCount": 0,
            "launchType": "EC2",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:3",
            "deploymentConfiguration": {
                "deploymentCircuitBreaker": {
                    "enable": false,
                    "rollback": false
                },
                "maximumPercent": 200,
                "minimumHealthyPercent": 100
            },
            "deployments": [
                {
                    "id": "ecs-svc/7851020056849183687",
                    "status": "PRIMARY",
                    "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:3",
                    "desiredCount": 0,
                    "pendingCount": 0,
                    "runningCount": 0,
                    "failedTasks": 0,
                    "createdAt": "2025-01-21T11:32:38.034000-06:00",
                    "updatedAt": "2025-01-21T11:32:38.034000-06:00",
                    "launchType": "EC2",
                    "networkConfiguration": {
                        "awsvpcConfiguration": {
                            "subnets": [
                                "subnet-12344321"
                            ],
                            "securityGroups": [
                                "sg-12344321"
                            ],
                            "assignPublicIp": "DISABLED"
                        }
                    },
                    "rolloutState": "IN_PROGRESS",
                    "rolloutStateReason": "ECS deployment ecs-svc/7851020056849183687 in progress.",
                    "volumeConfigurations": [
                        {
                            "name": "myEBSVolume",
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
            "events": [],
            "createdAt": "2025-01-21T11:32:38.034000-06:00",
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
                    "assignPublicIp": "DISABLED"
                }
            },
            "healthCheckGracePeriodSeconds": 0,
            "schedulingStrategy": "REPLICA",
            "deploymentController": {
                "type": "ECS"
            },
            "createdBy": "arn:aws:iam::123456789012:user/AIDACKCEVSQ6C2EXAMPLE",
            "enableECSManagedTags": false,
            "propagateTags": "NONE",
            "enableExecuteCommand": false,
            "availabilityZoneRebalancing": "DISABLED"
        }
    }

For more information, see `Use Amazon EBS volumes with Amazon ECS <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-volumes.html>`__ in the *Amazon ECS Developer Guide*.