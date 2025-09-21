**Example 1: To delete a capacity provider using the Amazon Resource Name (ARN)**

The following ``delete-capacity-provider`` example deletes a capacity provider by specifying the Amazon Resource Name (ARN) of the capacity provider. The ARN as well as the status of the capacity provider deletion can be retrieved using the ``describe-capacity-providers`` command. ::

    aws ecs delete-capacity-provider \
        --capacity-provider arn:aws:ecs:us-west-2:123456789012:capacity-provider/ExampleCapacityProvider

Output::

    {
        "capacityProvider": {
            "capacityProviderArn": "arn:aws:ecs:us-west-2:123456789012:capacity-provider/ExampleCapacityProvider",
            "name": "ExampleCapacityProvider",
            "status": "ACTIVE",
            "autoScalingGroupProvider": {
                "autoScalingGroupArn": "arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:autoScalingGroupName/MyAutoScalingGroup",
                "managedScaling": {
                    "status": "ENABLED",
                    "targetCapacity": 100,
                    "minimumScalingStepSize": 1,
                    "maximumScalingStepSize": 10000
                },
                "managedTerminationProtection": "DISABLED"
            },
            "updateStatus": "DELETE_IN_PROGRESS",
            "tags": []
        }
    }

For more information, see `Cluster capacity providers <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.

**Example 2: To delete a capacity provider using the name**

The following ``delete-capacity-provider`` example deletes a capacity provider by specifying the short name of the capacity provider. The short name as well as the status of the capacity provider deletion can be retrieved using the ``describe-capacity-providers`` command. ::

    aws ecs delete-capacity-provider \
        --capacity-provider ExampleCapacityProvider

Output::

    {
        "capacityProvider": {
            "capacityProviderArn": "arn:aws:ecs:us-west-2:123456789012:capacity-provider/ExampleCapacityProvider",
            "name": "ExampleCapacityProvider",
            "status": "ACTIVE",
            "autoScalingGroupProvider": {
                "autoScalingGroupArn": "arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:autoScalingGroupName/MyAutoScalingGroup",
                "managedScaling": {
                    "status": "ENABLED",
                    "targetCapacity": 100,
                    "minimumScalingStepSize": 1,
                    "maximumScalingStepSize": 10000
                },
                "managedTerminationProtection": "DISABLED"
            },
            "updateStatus": "DELETE_IN_PROGRESS",
            "tags": []
        }
    }

For more information, see `Cluster capacity providers <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.