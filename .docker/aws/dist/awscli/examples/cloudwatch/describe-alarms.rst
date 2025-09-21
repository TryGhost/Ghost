**To list information about an alarm**

The following example uses the ``describe-alarms`` command to provide information about the alarm named "myalarm"::

  aws cloudwatch describe-alarms --alarm-names "myalarm"

Output::

  {
      "MetricAlarms": [
          {
              "EvaluationPeriods": 2,
              "AlarmArn": "arn:aws:cloudwatch:us-east-1:123456789012:alarm:myalarm",
              "StateUpdatedTimestamp": "2014-04-09T18:59:06.442Z",
              "AlarmConfigurationUpdatedTimestamp": "2012-12-27T00:49:54.032Z",
              "ComparisonOperator": "GreaterThanThreshold",
              "AlarmActions": [
                  "arn:aws:sns:us-east-1:123456789012:myHighCpuAlarm"
              ],
              "Namespace": "AWS/EC2",
              "AlarmDescription": "CPU usage exceeds 70 percent",
              "StateReasonData": "{\"version\":\"1.0\",\"queryDate\":\"2014-04-09T18:59:06.419+0000\",\"startDate\":\"2014-04-09T18:44:00.000+0000\",\"statistic\":\"Average\",\"period\":300,\"recentDatapoints\":[38.958,40.292],\"threshold\":70.0}",
              "Period": 300,
              "StateValue": "OK",
              "Threshold": 70.0,
              "AlarmName": "myalarm",
              "Dimensions": [
                  {
                      "Name": "InstanceId",
                      "Value": "i-0c986c72"
                  }
              ],
              "Statistic": "Average",
              "StateReason": "Threshold Crossed: 2 datapoints were not greater than the threshold (70.0). The most recent datapoints: [38.958, 40.292].",
              "InsufficientDataActions": [],
              "OKActions": [],
              "ActionsEnabled": true,
              "MetricName": "CPUUtilization"
          }
      ]
  }
