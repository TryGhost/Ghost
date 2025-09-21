**To create a task set**

The following ``create-task-set`` example creates a task set in a service that uses an external deployment controller. ::

    aws ecs create-task-set \
        --cluster MyCluster \
        --service MyService \
        --task-definition MyTaskDefinition:2 \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-12344321],securityGroups=[sg-12344321]}"

Output::

    {
        "taskSet": {
            "id": "ecs-svc/1234567890123456789",
            "taskSetArn": "arn:aws:ecs:us-west-2:123456789012:task-set/MyCluster/MyService/ecs-svc/1234567890123456789",
            "status": "ACTIVE",
            "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/MyTaskDefinition:2",
            "computedDesiredCount": 0,
            "pendingCount": 0,
            "runningCount": 0,
            "createdAt": 1557128360.711,
            "updatedAt": 1557128360.711,
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
            "loadBalancers": [],
            "serviceRegistries": [],
            "scale": {
                "value": 0.0,
                "unit": "PERCENT"
            },
            "stabilityStatus": "STABILIZING",
            "stabilityStatusAt": 1557128360.711
        }
    }
