**To describe scaling policies**

This example command describes the scaling policies for the `ecs` service namespace.

Command::

  aws application-autoscaling describe-scaling-policies --service-namespace ecs

Output::

  {
      "ScalingPolicies": [
          {
              "PolicyName": "web-app-cpu-gt-75",
              "ScalableDimension": "ecs:service:DesiredCount",
              "ResourceId": "service/default/web-app",
              "CreationTime": 1462561899.23,
              "StepScalingPolicyConfiguration": {
                  "Cooldown": 60,
                  "StepAdjustments": [
                      {
                          "ScalingAdjustment": 200,
                          "MetricIntervalLowerBound": 0.0
                      }
                  ],
                  "AdjustmentType": "PercentChangeInCapacity"
              },
              "PolicyARN": "arn:aws:autoscaling:us-west-2:012345678910:scalingPolicy:6d8972f3-efc8-437c-92d1-6270f29a66e7:resource/ecs/service/default/web-app:policyName/web-app-cpu-gt-75",
              "PolicyType": "StepScaling",
              "Alarms": [
                  {
                      "AlarmName": "web-app-cpu-gt-75",
                      "AlarmARN": "arn:aws:cloudwatch:us-west-2:012345678910:alarm:web-app-cpu-gt-75"
                  }
              ],
              "ServiceNamespace": "ecs"
          },
          {
              "PolicyName": "web-app-cpu-lt-25",
              "ScalableDimension": "ecs:service:DesiredCount",
              "ResourceId": "service/default/web-app",
              "CreationTime": 1462562575.099,
              "StepScalingPolicyConfiguration": {
                  "Cooldown": 1,
                  "StepAdjustments": [
                      {
                          "ScalingAdjustment": -50,
                          "MetricIntervalUpperBound": 0.0
                      }
                  ],
                  "AdjustmentType": "PercentChangeInCapacity"
              },
              "PolicyARN": "arn:aws:autoscaling:us-west-2:012345678910:scalingPolicy:6d8972f3-efc8-437c-92d1-6270f29a66e7:resource/ecs/service/default/web-app:policyName/web-app-cpu-lt-25",
              "PolicyType": "StepScaling",
              "Alarms": [
                  {
                      "AlarmName": "web-app-cpu-lt-25",
                      "AlarmARN": "arn:aws:cloudwatch:us-west-2:012345678910:alarm:web-app-cpu-lt-25"
                  }
              ],
              "ServiceNamespace": "ecs"
          }
      ]
  }
