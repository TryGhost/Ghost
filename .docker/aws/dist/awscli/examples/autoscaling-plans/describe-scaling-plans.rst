**To describe a scaling plan**

The following ``describe-scaling-plans`` example displays the details of the specified scaling plan. ::

    aws autoscaling-plans describe-scaling-plans \
        --scaling-plan-names scaling-plan-with-asg-and-ddb

Output::

    {
        "ScalingPlans": [
            {
                "LastMutatingRequestTime": 1565388443.963,
                "ScalingPlanVersion": 1,
                "CreationTime": 1565388443.963,
                "ScalingInstructions": [
                    {
                        "ScalingPolicyUpdateBehavior": "ReplaceExternalPolicies",
                        "ScalableDimension": "autoscaling:autoScalingGroup:DesiredCapacity",
                        "TargetTrackingConfigurations": [
                            {
                                "PredefinedScalingMetricSpecification": {
                                    "PredefinedScalingMetricType": "ASGAverageCPUUtilization"
                                },
                                "TargetValue": 50.0,
                                "EstimatedInstanceWarmup": 300,
                                "DisableScaleIn": false
                            }
                        ],
                        "ResourceId": "autoScalingGroup/my-asg",
                        "DisableDynamicScaling": false,
                        "MinCapacity": 1,
                        "ServiceNamespace": "autoscaling",
                        "MaxCapacity": 10
                    },
                    {
                        "ScalingPolicyUpdateBehavior": "ReplaceExternalPolicies",
                        "ScalableDimension": "dynamodb:table:ReadCapacityUnits",
                        "TargetTrackingConfigurations": [
                            {
                                "PredefinedScalingMetricSpecification": {
                                    "PredefinedScalingMetricType": "DynamoDBReadCapacityUtilization"
                                },
                                "TargetValue": 50.0,
                                "ScaleInCooldown": 60,
                                "DisableScaleIn": false,
                                "ScaleOutCooldown": 60
                            }
                        ],
                        "ResourceId": "table/my-table",
                        "DisableDynamicScaling": false,
                        "MinCapacity": 5,
                        "ServiceNamespace": "dynamodb",
                        "MaxCapacity": 10000
                    },
                    {
                        "ScalingPolicyUpdateBehavior": "ReplaceExternalPolicies",
                        "ScalableDimension": "dynamodb:table:WriteCapacityUnits",
                        "TargetTrackingConfigurations": [
                            {
                                "PredefinedScalingMetricSpecification": {
                                    "PredefinedScalingMetricType": "DynamoDBWriteCapacityUtilization"
                                },
                                "TargetValue": 50.0,
                                "ScaleInCooldown": 60,
                                "DisableScaleIn": false,
                                "ScaleOutCooldown": 60
                            }
                        ],
                        "ResourceId": "table/my-table",
                        "DisableDynamicScaling": false,
                        "MinCapacity": 5,
                        "ServiceNamespace": "dynamodb",
                        "MaxCapacity": 10000
                    }
                ],
                "ApplicationSource": {
                    "TagFilters": [
                        {
                            "Values": [
                                "my-application-id"
                            ],
                            "Key": "application"
                        }
                    ]
                },
                "StatusStartTime": 1565388455.836,
                "ScalingPlanName": "scaling-plan-with-asg-and-ddb",
                "StatusMessage": "Scaling plan has been created and applied to all resources.",
                "StatusCode": "Active"
            }
        ]
    }

For more information, see `What Is AWS Auto Scaling? <https://docs.aws.amazon.com/autoscaling/plans/userguide/what-is-aws-auto-scaling.html>`__ in the *AWS Auto Scaling User Guide*.
