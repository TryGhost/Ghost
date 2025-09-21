**To create a service level objective (SLO)**

The following ``create-service-level-objective`` example creates a service level objective (SLO), which can help you ensure that your critical business operations are meeting customer expectations. ::

    aws application-signals create-service-level-objective \
        --name "SLOName" \
        --description "Description of your SLO" \
        --sli-config file://sli-config.json

Contents of ``sli-config.json``::

    {
        "SliMetricConfig": {
            "MetricDataQueries": [
                {
                    "Id": "m1",
                    "MetricStat": {
                        "Metric": {
                            "Namespace": "AWS/EC2",
                            "MetricName": "CPUUtilization",
                            "Dimensions": [
                                {
                                    "Name": "InstanceId",
                                    "Value": "i-0e5a1234561522"
                                }
                            ]
                        },
                        "Period": 60,
                        "Stat": "Average"
                    },
                    "ReturnData": true
                }
            ]
        },
        "MetricThreshold": 200,
        "ComparisonOperator": "LessThanOrEqualTo"
    }
    
Output::

    {
        "Slo": {
        "Arn": "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName",
        "Name": "SLOName",
        "Description": "Description of your SLO",
        "CreatedTime": "2024-12-27T08:16:09.032000+05:30",
        "LastUpdatedTime": "2024-12-27T08:16:09.032000+05:30",
        "Sli": {
            "SliMetric": {
                "MetricDataQueries": [
                    {
                        "Id": "m1",
                        "MetricStat": {
                            "Metric": {
                                "Namespace": "AWS/EC2",
                                "MetricName": "CPUUtilization",
                                "Dimensions": [
                                    {
                                        "Name": "InstanceId",
                                        "Value": "i-0e59876543234522"
                                    }
                                ]
                            },
                            "Period": 60,
                            "Stat": "Average"
                        },
                        "ReturnData": true
                    }
                ]
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
            "AttainmentGoal": 99.0,
            "WarningThreshold": 50.0
          }
        }
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.