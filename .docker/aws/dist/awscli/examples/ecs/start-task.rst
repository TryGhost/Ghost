**Example 1: To start a new task**

The following ``start-task`` example starts a task using the latest revision of the ``sleep360`` task definition on the specified container instance in the default cluster. ::

    aws ecs start-task \
        --task-definition sleep360 \
        --container-instances 765936fadbdd46b5991a4bd70c2a43d4

Output::

    {
        "tasks": [
            {
                "taskArn": "arn:aws:ecs:us-west-2:123456789012:task/default/666fdccc2e2d4b6894dd422f4eeee8f8",
                "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/default",
                "taskDefinitionArn": "arn:aws:ecs:us-west-2:123456789012:task-definition/sleep360:3",
                "containerInstanceArn": "arn:aws:ecs:us-west-2:123456789012:container-instance/default/765936fadbdd46b5991a4bd70c2a43d4",
                "overrides": {
                    "containerOverrides": [
                        {
                            "name": "sleep"
                        }
                    ]
                },
                "lastStatus": "PENDING",
                "desiredStatus": "RUNNING",
                "cpu": "128",
                "memory": "128",
                "containers": [
                    {
                        "containerArn": "arn:aws:ecs:us-west-2:123456789012:container/75f11ed4-8a3d-4f26-a33b-ad1db9e02d41",
                        "taskArn": "arn:aws:ecs:us-west-2:123456789012:task/default/666fdccc2e2d4b6894dd422f4eeee8f8",
                        "name": "sleep",
                        "lastStatus": "PENDING",
                        "networkInterfaces": [],
                        "cpu": "10",
                        "memory": "10"
                    }
                ],
                "version": 1,
                "createdAt": 1563421494.186,
                "group": "family:sleep360",
                "launchType": "EC2",
                "attachments": [],
                "tags": []
            }
        ],
        "failures": []
    }

For more information, see `Schedule your containers on Amazon ECS <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html>`__ in the *Amazon ECS Developer Guide*.

**Example 2: To configure an Amazon EBS volume at task start**

The following ``start-task`` example configures an encrypted Amazon EBS volume for a task on the specified container instance. You must have an Amazon ECS infrastructure role configured with the ``AmazonECSInfrastructureRolePolicyForVolumes`` managed policy attached. You must specify a task definition with the same volume name as in the ``start-task`` request. This example uses the ``--cli-input-json`` option and a JSON input file called ``ebs.json`` with the following content. ::

    aws ecs start-task \
        --cli-input-json file://ebs.json \
        --container-instances 765936fadbdd46b5991a4bd70c2a43d4

Contents of ``ebs.json``::

    {
       "cluster": "default",
       "taskDefinition": "mytaskdef",
       "networkConfiguration":{
            "awsvpcConfiguration":{
                "assignPublicIp": "ENABLED",
                "securityGroups": ["sg-12344321"],
                "subnets":["subnet-12344321"]
            }
        },
       "volumeConfigurations": [
            {
                "name": "myEBSVolume",
                "managedEBSVolume": {
                    "volumeType": "gp3",
                    "sizeInGiB": 100,
                    "roleArn":"arn:aws:iam::123456789012:role/ecsInfrastructureRole",
                    "encrypted": true,
                    "kmsKeyId": "arn:aws:kms:region:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"
                }
            }
        ]
    }

Output::

    {
        "tasks": [
            {
                "attachments": [
                    {
                        "id": "aea29489-9dcd-49f1-8164-4d91566e1113",
                        "type": "ElasticNetworkInterface",
                        "status": "PRECREATED",
                        "details": [
                            {
                                "name": "subnetId",
                                "value": "subnet-12344321"
                            }
                        ]
                    },
                    {
                        "id": "f29e1222-9a1e-410f-b499-a12a7cd6d42e",
                        "type": "AmazonElasticBlockStorage",
                        "status": "CREATED",
                        "details": [
                            {
                                "name": "roleArn",
                                "value": "arn:aws:iam::123456789012:role/ecsInfrastructureRole"
                            },
                            {
                                "name": "volumeName",
                                "value": "myEBSVolume"
                            },
                            {
                                "name": "deleteOnTermination",
                                "value": "true"
                            }
                        ]
                    }
                ],
                "attributes": [
                    {
                        "name": "ecs.cpu-architecture",
                        "value": "arm64"
                    }
                ],
                "availabilityZone": "us-west-2c",
                "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/default",
                "containerInstanceArn": "arn:aws:ecs:us-west-2:123456789012:container-instance/default/765936fadbdd46b5991a4bd70c2a43d4",
                "containers": [
                    {
                        "containerArn": "arn:aws:ecs:us-west-2:123456789012:container/default/bb122ace3ed84add92c00a351a03c69e/a4a9ed10-51c7-4567-9653-50e71b94f867",
                        "taskArn": "arn:aws:ecs:us-west-2:123456789012:task/default/bb122ace3ed84add92c00a351a03c69e",
                        "name": "container-using-ebs",
                        "image": "amazonlinux:2",
                        "lastStatus": "PENDING",
                        "networkInterfaces": [],
                        "cpu": "0"
                    }
                ],
                "cpu": "1024",
                "createdAt": "2025-01-23T14:51:05.191000-06:00",
                "desiredStatus": "RUNNING",
                "enableExecuteCommand": false,
                "group": "family:mytaskdef",
                "lastStatus": "PROVISIONING",
                "launchType": "EC2",
                "memory": "3072",
                "overrides": {
                    "containerOverrides": [
                        {
                            "name": "container-using-ebs"
                        }
                    ],
                    "inferenceAcceleratorOverrides": []
                },
                 "tags": [],
                "taskArn": "arn:aws:ecs:us-west-2:123456789012:task/default/bb122ace3ed84add92c00a351a03c69e",
                "taskDefinitionArn": "arn:aws:ecs:us-west-2:123456789012:task-definition/mytaskdef:4",
                "version": 1
            }
        ],
        "failures": []
    }

For more information, see `Use Amazon EBS volumes with Amazon ECS <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-volumes.html>`__ in the *Amazon ECS Developer Guide*.
