**To describe a service**

The following ``describe-services`` example retrieves details for the ``my-http-service`` service in the default cluster. ::

    aws ecs describe-services --services my-http-service

Output::

    {
        "services": [
            {
                "status": "ACTIVE",
                "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/amazon-ecs-sample:1",
                "pendingCount": 0,
                "loadBalancers": [],
                "desiredCount": 10,
                "createdAt": 1466801808.595,
                "serviceName": "my-http-service",
                "clusterArn": "arn:aws:ecs:us-west-2:123456789012:cluster/default",
                "serviceArn": "arn:aws:ecs:us-west-2:123456789012:service/my-http-service",
                "deployments": [
                    {
                        "status": "PRIMARY",
                        "pendingCount": 0,
                        "createdAt": 1466801808.595,
                        "desiredCount": 10,
                        "taskDefinition": "arn:aws:ecs:us-west-2:123456789012:task-definition/amazon-ecs-sample:1",
                        "updatedAt": 1428326312.703,
                        "id": "ecs-svc/1234567890123456789",
                        "runningCount": 10
                    }
                ],
                "events": [
                    {
                        "message": "(service my-http-service) has reached a steady state.",
                        "id": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                        "createdAt": 1466801812.435
                    }
                ],
                "runningCount": 10
            }
        ],
        "failures": []
    }

For more information, see `Services <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html>`_ in the *Amazon ECS Developer Guide*.