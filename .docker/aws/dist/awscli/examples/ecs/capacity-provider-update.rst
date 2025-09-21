**Update the capacity provider in an ECS cluster**

The following ``update-capacity-provider`` example shows how we can modify the parameters of the capacity provider in an ECS cluster. ::

    aws ecs update-capacity-provider \
        --name Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt \
        --auto-scaling-group-provider "managedScaling={status=DISABLED,targetCapacity=50,minimumScalingStepSize=2,maximumScalingStepSize=30,instanceWarmupPeriod=200},managedTerminationProtection=DISABLED,managedDraining=DISABLED"

Output::

    {
        "capacityProvider": {
            "capacityProviderArn": "arn:aws:ecs:us-west-2:123456789012:capacity-provider/Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt",
            "name": "Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-EC2CapacityProvider-3fIpdkLywwFt",
            "status": "ACTIVE",
            "autoScalingGroupProvider": {
                "autoScalingGroupArn": "arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:424941d1-b43f-4a17-adbb-08b6a6e397e1:autoScalingGroupName/Infra-ECS-Cluster-ECS-project-update-cluster-d6bb6d5b-ECSAutoScalingGroup-f44jrQHS2nRB",
                "managedScaling": {
                    "status": "ENABLED",
                    "targetCapacity": 100,
                    "minimumScalingStepSize": 1,
                    "maximumScalingStepSize": 10000,
                    "instanceWarmupPeriod": 300
                },
                "managedTerminationProtection": "DISABLED",
                "managedDraining": "ENABLED"
            },
            "updateStatus": "UPDATE_IN_PROGRESS",
            "tags": []
        }
    }

For more information on Capacity Provider, see `Amazon ECS capacity providers for the EC2 launch type <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html>`__ in the *Amazon ECS Developer Guide*.
