**To describe scalable targets**

The following ``describe-scalable-targets`` example describes the scalable targets for the ``ecs`` service namespace. ::

    aws application-autoscaling describe-scalable-targets \
        --service-namespace ecs

Output::

    {
        "ScalableTargets": [
            {
                "ServiceNamespace": "ecs",
                "ScalableDimension": "ecs:service:DesiredCount",
                "ResourceId": "service/default/web-app",
                "MinCapacity": 1,
                "MaxCapacity": 10,
                "RoleARN": "arn:aws:iam::123456789012:role/aws-service-role/ecs.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_ECSService",
                "CreationTime": 1462558906.199,
                "SuspendedState": {
                    "DynamicScalingOutSuspended": false,
                    "ScheduledScalingSuspended": false,
                    "DynamicScalingInSuspended": false
                },
                "ScalableTargetARN": "arn:aws:application-autoscaling:us-west-2:123456789012:scalable-target/1234abcd56ab78cd901ef1234567890ab123"
            }
        ]
    }

For more information, see `AWS services that you can use with Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/integrated-services-list.html>`__ in the *Application Auto Scaling User Guide*.