**Example 1: To describe the health of the targets for a target group**

The following ``describe-target-health`` example displays health details for the targets of the specified target group. These targets are healthy. ::

    aws elbv2 describe-target-health \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067

Output::

    {
        "TargetHealthDescriptions": [
            {
                "HealthCheckPort": "80",
                "Target": {
                    "Id": "i-ceddcd4d",
                    "Port": 80
                },
                "TargetHealth": {
                    "State": "healthy"
                }
            },
            {
                "HealthCheckPort": "80",
                "Target": {
                    "Id": "i-0f76fade",
                    "Port": 80
                },
                "TargetHealth": {
                    "State": "healthy"
                }
            }
        ]
    }

**Example 2: To describe the health of a target**

The following ``describe-target-health`` example displays health details for the specified target. This target is healthy. ::

    aws elbv2 describe-target-health \
        --targets Id=i-0f76fade,Port=80 \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067

Output::

    {
        "TargetHealthDescriptions": [
            {
                "HealthCheckPort": "80",
                "Target": {
                    "Id": "i-0f76fade",
                    "Port": 80
                },
                "TargetHealth": {
                    "State": "healthy"
                }
            }
        ]
    }

The following example output is for a target whose target group is not specified in an action for a listener. This target can't receive traffic from the load balancer. ::

    {
        "TargetHealthDescriptions": [
        {
            "HealthCheckPort": "80",
            "Target": {
                "Id": "i-0f76fade",
                "Port": 80
            },
                "TargetHealth": {
                    "State": "unused",
                    "Reason": "Target.NotInUse",
                    "Description": "Target group is not configured to receive traffic from the load balancer"
                }
            }
        ]
    }

The following example output is for a target whose target group was just specified in an action for a listener. The target is still being registered. ::

    {
        "TargetHealthDescriptions": [
            {
                "HealthCheckPort": "80",
                "Target": {
                    "Id": "i-0f76fade",
                    "Port": 80
                },
                "TargetHealth": {
                    "State": "initial",
                    "Reason": "Elb.RegistrationInProgress",
                    "Description": "Target registration is in progress"
                }
            }
        ]
    }

The following example output is for an unhealthy target. ::

    {
        "TargetHealthDescriptions": [
            {
                "HealthCheckPort": "80",
                "Target": {
                    "Id": "i-0f76fade",
                    "Port": 80
                },
                "TargetHealth": {
                    "State": "unhealthy",
                    "Reason": "Target.Timeout",
                    "Description": "Connection to target timed out"
                }
            }
        ]
    }

The following example output is for a target that is a Lambda function and health checks are disabled. ::

    {
        "TargetHealthDescriptions": [
            {
                "Target": {
                    "Id": "arn:aws:lambda:us-west-2:123456789012:function:my-function",
                    "AvailabilityZone": "all",
                },
                "TargetHealth": {
                    "State": "unavailable",
                    "Reason": "Target.HealthCheckDisabled",
                    "Description": "Health checks are not enabled for this target"
                }
            }
        ]
    }
