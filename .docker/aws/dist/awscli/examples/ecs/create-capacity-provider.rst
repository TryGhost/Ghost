**To create a capacity provider**

The following create-capacity-provider example creates a capacity provider that uses an Auto Scaling group named MyASG, has managed scaling and managed termination protection enabled. This configuration is used for Amazon ECS cluster auto scaling. ::

    aws ecs create-capacity-provider \
        --name "MyCapacityProvider" \
        --auto-scaling-group-provider "autoScalingGroupArn=arn:aws:autoscaling:us-east-1:123456789012:autoScalingGroup:57ffcb94-11f0-4d6d-bf60-3bac5EXAMPLE:autoScalingGroupName/MyASG,managedScaling={status=ENABLED,targetCapacity=100},managedTerminationProtection=ENABLED" 

Output::

    {
        "capacityProvider": {
        "capacityProviderArn": "arn:aws:ecs:us-east-1:123456789012:capacity-provider/MyCapacityProvider",
        "name": "MyCapacityProvider",
        "status": "ACTIVE",
        "autoScalingGroupProvider": {
            "autoScalingGroupArn": "arn:aws:autoscaling:us-east-1:132456789012:autoScalingGroup:57ffcb94-11f0-4d6d-bf60-3bac5EXAMPLE:autoScalingGroupName/MyASG",
            "managedScaling": {
                "status": "ENABLED",
                "targetCapacity": 100,
                "minimumScalingStepSize": 1,
                "maximumScalingStepSize": 10000,
                "instanceWarmupPeriod": 300
            },
            "managedTerminationProtection": "ENABLED"
        },
        "tags": []
    }

For more information, see `Amazon ECS cluster auto scaling <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-auto-scaling.html>`__ in the *Amazon ECS Developer Guide*.