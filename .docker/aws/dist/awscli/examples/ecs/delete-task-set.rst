**To delete a task set**

The following ``delete-task-set`` example shows how to delete a task set. You can include the ``--force`` parameter to delete a task set even if it has not been scaled to zero. ::

    aws ecs delete-task-set \
        --cluster MyCluster \
        --service MyService \
        --task-set arn:aws:ecs:us-west-2:123456789012:task-set/MyCluster/MyService/ecs-svc/1234567890123456789 \
        --force

Output::

    {
        "taskSet": {
            "id": "ecs-svc/1234567890123456789",
            "taskSetArn": "arn:aws:ecs:us-west-2:123456789012:task-set/MyCluster/MyService/ecs-svc/1234567890123456789",
            "status": "DRAINING",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/sample-fargate:2",
            "computedDesiredCount": 0,
            "pendingCount": 0,
            "runningCount": 0,
            "createdAt": 1557130260.276,
            "updatedAt": 1557130290.707,
            "launchType": "EC2",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-12345678"
                    ],
                    "securityGroups": [
                        "sg-12345678"
                    ],
                    "assignPublicIp": "DISABLED"
                }
            },
            "loadBalancers": [],
            "serviceRegistries": [],
            "scale": {
                "value": 0.0,
                "unit": "PERCENT"
            },
            "stabilityStatus": "STABILIZING",
            "stabilityStatusAt": 1557130290.707
        }
    }
