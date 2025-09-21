**Example 1: To apply a target tracking scaling policy with a predefined metric specification**

The following ``put-scaling-policy`` example applies a target tracking scaling policy with a predefined metric specification to an Amazon ECS service called web-app in the default cluster. The policy keeps the average CPU utilization of the service at 75 percent, with scale-out and scale-in cooldown periods of 60 seconds. The output contains the ARNs and names of the two CloudWatch alarms created on your behalf. ::

    aws application-autoscaling put-scaling-policy --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/default/web-app \
    --policy-name cpu75-target-tracking-scaling-policy --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration file://config.json

This example assumes that you have a `config.json` file in the current directory with the following contents::

    {
         "TargetValue": 75.0,
         "PredefinedMetricSpecification": {
             "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
         },
         "ScaleOutCooldown": 60,
        "ScaleInCooldown": 60
    }

Output::

    {
        "PolicyARN": "arn:aws:autoscaling:us-west-2:012345678910:scalingPolicy:6d8972f3-efc8-437c-92d1-6270f29a66e7:resource/ecs/service/default/web-app:policyName/cpu75-target-tracking-scaling-policy",
        "Alarms": [
            {
                "AlarmARN": "arn:aws:cloudwatch:us-west-2:012345678910:alarm:TargetTracking-service/default/web-app-AlarmHigh-d4f0770c-b46e-434a-a60f-3b36d653feca",
                "AlarmName": "TargetTracking-service/default/web-app-AlarmHigh-d4f0770c-b46e-434a-a60f-3b36d653feca"
            },
            {
                "AlarmARN": "arn:aws:cloudwatch:us-west-2:012345678910:alarm:TargetTracking-service/default/web-app-AlarmLow-1b437334-d19b-4a63-a812-6c67aaf2910d",
                "AlarmName": "TargetTracking-service/default/web-app-AlarmLow-1b437334-d19b-4a63-a812-6c67aaf2910d"
            }
        ]
    }

**Example 2: To apply a target tracking scaling policy with a customized metric specification**

The following ``put-scaling-policy`` example applies a target tracking scaling policy with a customized metric specification to an Amazon ECS service called web-app in the default cluster. The policy keeps the average utilization of the service at 75 percent, with scale-out and scale-in cooldown periods of 60 seconds. The output contains the ARNs and names of the two CloudWatch alarms created on your behalf. ::

    aws application-autoscaling put-scaling-policy --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/default/web-app \
    --policy-name cms75-target-tracking-scaling-policy
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration file://config.json

This example assumes that you have a `config.json` file in the current directory with the following contents::

    {
        "TargetValue":75.0,  
        "CustomizedMetricSpecification":{
            "MetricName":"MyUtilizationMetric",
            "Namespace":"MyNamespace",
            "Dimensions": [
                {
                    "Name":"MyOptionalMetricDimensionName",
                    "Value":"MyOptionalMetricDimensionValue"
                }
            ],
            "Statistic":"Average",
            "Unit":"Percent"
        },
        "ScaleOutCooldown": 60,
        "ScaleInCooldown": 60
    }

Output::

    {
        "PolicyARN": "arn:aws:autoscaling:us-west-2:012345678910:scalingPolicy: 8784a896-b2ba-47a1-b08c-27301cc499a1:resource/ecs/service/default/web-app:policyName/cms75-target-tracking-scaling-policy",
        "Alarms": [
            {
                "AlarmARN": "arn:aws:cloudwatch:us-west-2:012345678910:alarm:TargetTracking-service/default/web-app-AlarmHigh-9bc77b56-0571-4276-ba0f-d4178882e0a0",
                "AlarmName": "TargetTracking-service/default/web-app-AlarmHigh-9bc77b56-0571-4276-ba0f-d4178882e0a0"
            },
            {
                "AlarmARN": "arn:aws:cloudwatch:us-west-2:012345678910:alarm:TargetTracking-service/default/web-app-AlarmLow-9b6ad934-6d37-438e-9e05-02836ddcbdc4",
                "AlarmName": "TargetTracking-service/default/web-app-AlarmLow-9b6ad934-6d37-438e-9e05-02836ddcbdc4"
            }
        ]
    }

**Example 3: To apply a target tracking scaling policy for scale out only**

The following ``put-scaling-policy`` example applies a target tracking scaling policy to an Amazon ECS service called ``web-app`` in the default cluster. The policy is used to scale out the ECS service when the ``RequestCountPerTarget`` metric from the Application Load Balancer exceeds the threshold. The output contains the ARN and name of the CloudWatch alarm created on your behalf. ::

    aws application-autoscaling put-scaling-policy \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/default/web-app \
        --policy-name alb-scale-out-target-tracking-scaling-policy \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration file://config.json

Contents of ``config.json``::

    {
         "TargetValue": 1000.0,
         "PredefinedMetricSpecification": {
             "PredefinedMetricType": "ALBRequestCountPerTarget",
             "ResourceLabel": "app/EC2Co-EcsEl-1TKLTMITMM0EO/f37c06a68c1748aa/targetgroup/EC2Co-Defau-LDNM7Q3ZH1ZN/6d4ea56ca2d6a18d"
         },
         "ScaleOutCooldown": 60,
        "ScaleInCooldown": 60,
        "DisableScaleIn": true
    }

Output::

    {
        "PolicyARN": "arn:aws:autoscaling:us-west-2:123456789012:scalingPolicy:6d8972f3-efc8-437c-92d1-6270f29a66e7:resource/ecs/service/default/web-app:policyName/alb-scale-out-target-tracking-scaling-policy",
        "Alarms": [
            {
                "AlarmName": "TargetTracking-service/default/web-app-AlarmHigh-d4f0770c-b46e-434a-a60f-3b36d653feca",
                "AlarmARN": "arn:aws:cloudwatch:us-west-2:123456789012:alarm:TargetTracking-service/default/web-app-AlarmHigh-d4f0770c-b46e-434a-a60f-3b36d653feca"
            }
        ]
    }

For more information, see `Target Tracking Scaling Policies for Application Auto Scaling <https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-target-tracking.html>`_ in the *AWS Application Auto Scaling User Guide*.
