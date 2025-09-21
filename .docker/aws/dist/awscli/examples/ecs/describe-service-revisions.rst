**To describe service revision details**

The following ``describe-service-revisions`` example returns the service revision details for the service revision with the ARN ``arn:aws:ecs:us-east-1:123456789012:service-revision/example-cluster/example-service/1485800978477494678``. ::

    aws ecs describe-service-revisions \
        --service-revision-arns arn:aws:ecs:us-east-1:123456789012:service-revision/example-cluster/example-service/1485800978477494678

Output::

    {
        "serviceRevisions": [
            {
                "serviceRevisionArn": "arn:aws:ecs:us-east-1:123456789012:service-revision/example-cluster/example-service/1485800978477494678",
                "serviceArn": "arn:aws:ecs:us-east-1:123456789012:service/example-cluster/example-service",
                "clusterArn": "arn:aws:ecs:us-east-1:123456789012:cluster/example-cluster",
                "taskDefinition": "arn:aws:ecs:us-east-1:123456789012:task-definition/webserver:5",
                "capacityProviderStrategy": [
                    {
                        "capacityProvider": "FARGATE",
                        "weight": 1,
                        "base": 0
                    }
                ],
                "platformVersion": "1.4.0",
                "platformFamily": "Linux",
                "networkConfiguration": {
                    "awsvpcConfiguration": {
                        "subnets": [
                            "subnet-0d0eab1bb38d5ca64",
                            "subnet-0db5010045995c2d5"
                        ],
                        "securityGroups": [
                            "sg-02556bf85a191f59a"
                        ],
                        "assignPublicIp": "ENABLED"
                    }
                },
                "containerImages": [
                    {
                        "containerName": "aws-otel-collector",
                        "imageDigest": "sha256:7a1b3560655071bcacd66902c20ebe9a69470d5691fe3bd36baace7c2f3c4640",
                        "image": "public.ecr.aws/aws-observability/aws-otel-collector:v0.32.0"
                    },
                    {
                        "containerName": "web",
                        "imageDigest": "sha256:28402db69fec7c17e179ea87882667f1e054391138f77ffaf0c3eb388efc3ffb",
                        "image": "nginx"
                    }
                ],
                "guardDutyEnabled": false,
                "serviceConnectConfiguration": {
                    "enabled": false
                },
                "createdAt": "2024-10-31T08:03:29.302000-04:00"
            }
        ],
        "failures": []
    }

For more information, see `Amazon ECS service revisions <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-revision.html>`_ in the *Amazon ECS Developer Guide*.
