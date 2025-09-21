**To update the primary task set for a service**

The following ``update-service-primary-task-set`` example updates the primary task set for the specified service. ::

    aws ecs update-service-primary-task-set \
        --cluster MyCluster \
        --service MyService \
        --primary-task-set arn:aws:ecs:us-west-2:123456789012:task-set/MyCluster/MyService/ecs-svc/1234567890123456789

Output::

    {
        "taskSet": {
            "id": "ecs-svc/1234567890123456789",
            "taskSetArn": "arn:aws:ecs:us-west-2:123456789012:task-set/MyCluster/MyService/ecs-svc/1234567890123456789",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/sample-fargate:2",
            "computedDesiredCount": 1,
            "pendingCount": 0,
            "runningCount": 0,
            "createdAt": 1557128360.711,
            "updatedAt": 1557129412.653,
            "launchType": "EC2",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-12344321"
                    ],
                    "securityGroups": [
                        "sg-12344312"
                    ],
                    "assignPublicIp": "DISABLED"
                }
            },
            "loadBalancers": [],
            "serviceRegistries": [],
            "scale": {
                "value": 50.0,
                "unit": "PERCENT"
            },
            "stabilityStatus": "STABILIZING",
            "stabilityStatusAt": 1557129279.914
        }
    }
