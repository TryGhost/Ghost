**To create a scaling plan**

The following ``create-scaling-plan`` example creates a scaling plan named ``my-scaling-plan`` using an already-created JSON file (named config.json). The structure of the scaling plan includes a scaling instruction for an Auto Scaling group named ``my-asg``. It specifies the ``TagFilters`` property as the application source and enables predictive scaling and dynamic scaling. ::

    aws autoscaling-plans create-scaling-plan \
        --scaling-plan-name my-scaling-plan \
        --cli-input-json file://~/config.json

Contents of ``config.json`` file::

    {
        "ApplicationSource": {
            "TagFilters": [
                {
                    "Key": "purpose",
                    "Values": [
                        "my-application"
                    ]
                }
            ]
        },
        "ScalingInstructions": [
            {
                "ServiceNamespace": "autoscaling",
                "ResourceId": "autoScalingGroup/my-asg",
                "ScalableDimension": "autoscaling:autoScalingGroup:DesiredCapacity",
                "ScheduledActionBufferTime": 300,
                "PredictiveScalingMaxCapacityBehavior": "SetForecastCapacityToMaxCapacity",
                "PredictiveScalingMode": "ForecastAndScale",
                "PredefinedLoadMetricSpecification": {
                    "PredefinedLoadMetricType": "ASGTotalCPUUtilization"
                },
                "ScalingPolicyUpdateBehavior": "ReplaceExternalPolicies",
                "MinCapacity": 1,
                "MaxCapacity": 4,
                "TargetTrackingConfigurations": [
                    {
                        "PredefinedScalingMetricSpecification": {
                            "PredefinedScalingMetricType": "ASGAverageCPUUtilization"
                        },
                        "TargetValue": 50
                    }
                ]
            }
        ]
    }

Output::

    {
    "ScalingPlanVersion": 1
    }

For more information, see the `AWS Auto Scaling User Guide <https://docs.aws.amazon.com/autoscaling/plans/userguide/what-is-aws-auto-scaling.html>`__.
