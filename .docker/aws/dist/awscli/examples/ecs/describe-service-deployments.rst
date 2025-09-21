**To describe service deployment details**

The following ``describe-service-deployments`` example returns the service deployment details for the service deployment with the ARN ``arn:aws:ecs:us-east-1:123456789012:service-deployment/example-cluster/example-service/ejGvqq2ilnbKT9qj0vLJe``. ::

    aws ecs describe-service-deployments \
        --service-deployment-arn arn:aws:ecs:us-east-1:123456789012:service-deployment/example-cluster/example-service/ejGvqq2ilnbKT9qj0vLJe

Output::

    {
        "serviceDeployments": [
            {
                "serviceDeploymentArn": "arn:aws:ecs:us-east-1:123456789012:service-deployment/example-cluster/example-service/ejGvqq2ilnbKT9qj0vLJe",
                "serviceArn": "arn:aws:ecs:us-east-1:123456789012:service/example-cluster/example-service",
                "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/example-cluster",
                "createdAt": "2024-10-31T08:03:30.917000-04:00",
                "startedAt": "2024-10-31T08:03:32.510000-04:00",
                "finishedAt": "2024-10-31T08:05:04.527000-04:00",
                "updatedAt": "2024-10-31T08:05:04.527000-04:00",
                "sourceServiceRevisions": [],
                "targetServiceRevision": {
                    "arn": "arn:aws:ecs:us-east-1:123456789012:service-revision/example-cluster/example-service/1485800978477494678",
                    "requestedTaskCount": 1,
                    "runningTaskCount": 1,
                    "pendingTaskCount": 0
                },
                "status": "SUCCESSFUL",
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
                "deploymentCircuitBreaker": {
                    "status": "MONITORING_COMPLETE",
                    "failureCount": 0,
                    "threshold": 3
                },
                "alarms": {
                    "status": "DISABLED"
                }
            }
        ],
        "failures": []
    }

For more information, see `View service history using Amazon ECS service deployments <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-deployment.html>`_ in the *Amazon ECS Developer Guide*.
