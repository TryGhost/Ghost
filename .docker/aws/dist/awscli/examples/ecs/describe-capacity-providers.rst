**Example 1: To describe all capacity providers**

The following ``describe-capacity-providers`` example retrieves details about all capacity providers. ::

    aws ecs describe-capacity-providers

Output::

    {
        "capacityProviders": [
            {
                "capacityProviderArn": "arn:aws:ecs:us-west-2:123456789012:capacity-provider/MyCapacityProvider",
                "name": "MyCapacityProvider",
                "status": "ACTIVE",
                "autoScalingGroupProvider": {
                    "autoScalingGroupArn": "arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:autoScalingGroupName/MyAutoScalingGroup",
                    "managedScaling": {
                        "status": "ENABLED",
                        "targetCapacity": 100,
                        "minimumScalingStepSize": 1,
                        "maximumScalingStepSize": 1000
                    },
                    "managedTerminationProtection": "ENABLED"
                },
                "tags": []
            },
            {
                "capacityProviderArn": "arn:aws:ecs:us-west-2:123456789012:capacity-provider/FARGATE",
                "name": "FARGATE",
                "status": "ACTIVE",
                "tags": []
            },
            {
                "capacityProviderArn": "arn:aws:ecs:us-west-2:123456789012:capacity-provider/FARGATE_SPOT",
                "name": "FARGATE_SPOT",
                "status": "ACTIVE",
                "tags": []
            }
        ]
    }


For more information, see `Cluster capacity providers <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.

**Example 2: To describe a specific capacity providers**

The following ``describe-capacity-providers`` example retrieves details about a specific capacity provider. Using the ``--include TAGS`` parameter will add the tags associated with the capacity provider to the output. ::

    aws ecs describe-capacity-providers \
        --capacity-providers MyCapacityProvider \
        --include TAGS

Output::

    {
        "capacityProviders": [
            {
                "capacityProviderArn": "arn:aws:ecs:us-west-2:123456789012:capacity-provider/MyCapacityProvider",
                "name": "MyCapacityProvider",
                "status": "ACTIVE",
                "autoScalingGroupProvider": {
                    "autoScalingGroupArn": "arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:autoScalingGroupName/MyAutoScalingGroup",                    
                    "managedScaling": {
                        "status": "ENABLED",
                        "targetCapacity": 100,
                        "minimumScalingStepSize": 1,
                        "maximumScalingStepSize": 1000
                    },
                    "managedTerminationProtection": "ENABLED"
                },
                "tags": [
                    {
                        "key": "environment",
                        "value": "production"
                    }
                ]
            }
        ]
    }

For more information, see `Cluster capacity providers <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.