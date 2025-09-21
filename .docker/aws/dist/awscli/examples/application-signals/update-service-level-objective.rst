**To update an existing service level objective (SLO)**

The following ``update-service-level-objective`` example updates an existing service level objective (SLO). ::

    aws application-signals update-service-level-objective \
    --cli-input-json file://update-slo.json

Contents of ``update-slo.json``::

    {
        "id": "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName",
        "goal": {
            "Interval": {
                "RollingInterval": {
                    "DurationUnit": "DAY",
                    "Duration": 7
                }
            },
            "AttainmentGoal": 90.0,
            "WarningThreshold": 50.0
        }
    }

Output::

    {
        "Slo": {
            "Arn": "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName",
            "Name": "SLOName",
            "Description": "Description of your SLO",
            "CreatedTime": "2024-12-24T22:19:18.624000+05:30",
            "LastUpdatedTime": "2024-12-27T08:51:38.278000+05:30",
            "Sli": {
                "SliMetric": {
                    "MetricDataQueries": [{
                        "Id": "m1",
                        "MetricStat": {
                            "Metric": {
                                "Namespace": "AWS/EC2",
                                "MetricName": "CPUUtilization",
                                "Dimensions": [{
                                    "Name": "InstanceId",
                                    "Value": "i-00987654345222"
                                }]
                            },
                            "Period": 60,
                            "Stat": "Average"
                        },
                        "ReturnData": true
                    }]
                },
                "MetricThreshold": 200.0,
                "ComparisonOperator": "LessThanOrEqualTo"
            },
            "EvaluationType": "PeriodBased",
            "Goal": {
                "Interval": {
                    "RollingInterval": {
                        "DurationUnit": "DAY",
                        "Duration": 7
                    }
                },
                "AttainmentGoal": 90.0,
                "WarningThreshold": 50.0
            }
        }
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.