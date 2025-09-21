**To describe the scalable resources for a scaling plan**

The following ``describe-scaling-plan-resources`` example displays details about the single scalable resource (an Auto Scaling group) that is associated with the specified scaling plan. ::

    aws autoscaling-plans describe-scaling-plan-resources \
        --scaling-plan-name my-scaling-plan \
        --scaling-plan-version 1

Output::

    {
        "ScalingPlanResources": [
            {
                "ScalableDimension": "autoscaling:autoScalingGroup:DesiredCapacity",
                "ScalingPlanVersion": 1,
                "ResourceId": "autoScalingGroup/my-asg",
                "ScalingStatusCode": "Active",
                "ScalingStatusMessage": "Target tracking scaling policies have been applied to the resource.",
                "ScalingPolicies": [
                    {
                        "PolicyName": "AutoScaling-my-asg-b1ab65ae-4be3-4634-bd64-c7471662b251",
                        "PolicyType": "TargetTrackingScaling",
                        "TargetTrackingConfiguration": {
                            "PredefinedScalingMetricSpecification": {
                                "PredefinedScalingMetricType": "ALBRequestCountPerTarget",
                                "ResourceLabel": "app/my-alb/f37c06a68c1748aa/targetgroup/my-target-group/6d4ea56ca2d6a18d"
                            },
                            "TargetValue": 40.0
                        }
                    }
                ],
                "ServiceNamespace": "autoscaling",
                "ScalingPlanName": "my-scaling-plan"
            }
        ]
    }         

For more information, see `What Is AWS Auto Scaling? <https://docs.aws.amazon.com/autoscaling/plans/userguide/what-is-aws-auto-scaling.html>`__ in the *AWS Auto Scaling User Guide*.
