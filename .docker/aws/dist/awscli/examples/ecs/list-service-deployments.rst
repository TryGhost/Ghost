**To list service deployments**

The following ``list-service-deployments`` example retrieves the service deployments for the service named ``example-service``. ::

    aws ecs list-service-deployments \
        --service arn:aws:ecs:us-east-1:123456789012:service/example-cluster/example-service

Output::

    {
        "serviceDeployments": [
            {
                "serviceDeploymentArn": "arn:aws:ecs:us-east-1:123456789012:service-deployment/example-cluster/example-service/ejGvqq2ilnbKT9qj0vLJe",
                "serviceArn": "arn:aws:ecs:us-east-1:123456789012:service/example-cluster/example-service",
                "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/example-cluster",
                "startedAt": "2024-10-31T08:03:32.510000-04:00",
                "createdAt": "2024-10-31T08:03:30.917000-04:00",
                "finishedAt": "2024-10-31T08:05:04.527000-04:00",
                "targetServiceRevisionArn": "arn:aws:ecs:us-east-1:123456789012:service-revision/example-cluster/example-service/1485800978477494678",
                "status": "SUCCESSFUL"
            }
        ]
    }

For more information, see `View service history using Amazon ECS service deployments <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-deployment.html>`_ in the *Amazon ECS Developer Guide*.
