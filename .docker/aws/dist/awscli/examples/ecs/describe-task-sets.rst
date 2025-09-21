**To describe a task set**

The following ``describe-task-sets`` example describes a task set in a service that uses an external deployer. ::

    aws ecs describe-task-sets \
        --cluster MyCluster \
        --service MyService \
        --task-sets arn:aws:ecs:us-west-2:123456789012:task-set/MyCluster/MyService/ecs-svc/1234567890123456789

Output::

    {
        "taskSets": [
            {
                "id": "ecs-svc/1234567890123456789",
                "taskSetArn": "arn:aws:ecs:us-west-2:123456789012:task-set/MyCluster/MyService/ecs-svc/1234567890123456789",
                "status": "ACTIVE",
                "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/sample-fargate:2",
                "computedDesiredCount": 0,
                "pendingCount": 0,
                "runningCount": 0,
                "createdAt": 1557207715.195,
                "updatedAt": 1557207740.014,
                "launchType": "EC2",
                "networkConfiguration": {
                    "awsvpcConfiguration": {
                        "subnets": [
                            "subnet-12344321"
                        ],
                        "securityGroups": [
                            "sg-1234431"
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
                "stabilityStatus": "STEADY_STATE",
                "stabilityStatusAt": 1557207740.014
            }
        ],
        "failures": []
    }

