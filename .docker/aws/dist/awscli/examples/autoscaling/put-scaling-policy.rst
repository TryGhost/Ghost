**To add a target tracking scaling policy to an Auto Scaling group**

The following ``put-scaling-policy`` example applies a target tracking scaling policy to the specified Auto Scaling group. The output contains the ARNs and names of the two CloudWatch alarms created on your behalf. If a scaling policy with the same name already exists, it will be overwritten by the new scaling policy. ::

    aws autoscaling put-scaling-policy --auto-scaling-group-name my-asg \
      --policy-name alb1000-target-tracking-scaling-policy \
      --policy-type TargetTrackingScaling \
      --target-tracking-configuration file://config.json

Contents of ``config.json``::

    {
         "TargetValue": 1000.0,
         "PredefinedMetricSpecification": {
              "PredefinedMetricType": "ALBRequestCountPerTarget",
              "ResourceLabel": "app/my-alb/778d41231b141a0f/targetgroup/my-alb-target-group/943f017f100becff"
         }
    }

Output::

   {
        "PolicyARN": "arn:aws:autoscaling:region:account-id:scalingPolicy:228f02c2-c665-4bfd-aaac-8b04080bea3c:autoScalingGroupName/my-asg:policyName/alb1000-target-tracking-scaling-policy",
        "Alarms": [
            {
                "AlarmARN": "arn:aws:cloudwatch:region:account-id:alarm:TargetTracking-my-asg-AlarmHigh-fc0e4183-23ac-497e-9992-691c9980c38e",
                "AlarmName": "TargetTracking-my-asg-AlarmHigh-fc0e4183-23ac-497e-9992-691c9980c38e"
            },
            {
                "AlarmARN": "arn:aws:cloudwatch:region:account-id:alarm:TargetTracking-my-asg-AlarmLow-61a39305-ed0c-47af-bd9e-471a352ee1a2",
                "AlarmName": "TargetTracking-my-asg-AlarmLow-61a39305-ed0c-47af-bd9e-471a352ee1a2"
            }
        ]
    }

For more examples, see `Example scaling policies for the AWS Command Line Interface (AWS CLI) <https://docs.aws.amazon.com/autoscaling/ec2/userguide/examples-scaling-policies.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.