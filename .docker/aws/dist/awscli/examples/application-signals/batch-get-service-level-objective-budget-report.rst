**To retrieve one or more service level objective (SLO) budget reports.**

The following ``batch-get-service-level-objective-budget-report`` example retrieves one or more service level objective (SLO) budget reports. ::

    aws application-signals batch-get-service-level-objective-budget-report \
    --timestamp 1735059869 \
    --slo-ids "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName1" "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName2"

Output::

    {
        "Timestamp": "2024-12-24T22:34:29+05:30",
        "Reports": [{
                "Arn": "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName1",
                "Name": "Your SLO Name",
                "EvaluationType": "PeriodBased",
                "BudgetStatus": "OK",
                "Attainment": 100.0,
                "TotalBudgetSeconds": 6048,
                "BudgetSecondsRemaining": 6048,
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
                                        "Value": "i-0e098765432522"
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
            },
            {
                "Arn": "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName2",
                "Name": "test",
                "EvaluationType": "PeriodBased",
                "BudgetStatus": "BREACHED",
                "Attainment": 97.39583275,
                "TotalBudgetSeconds": 86,
                "BudgetSecondsRemaining": -2154,
                "Sli": {
                    "SliMetric": {
                        "MetricDataQueries": [{
                            "Id": "cwMetric",
                            "MetricStat": {
                                "Metric": {
                                    "Namespace": "AWS/EC2",
                                    "MetricName": "CPUUtilization",
                                    "Dimensions": [{
                                        "Name": "InstanceId",
                                        "Value": "i-0e12345678922"
                                    }]
                                },
                                "Period": 300,
                                "Stat": "Average"
                            },
                            "ReturnData": true
                        }]
                    },
                    "MetricThreshold": 5.0,
                    "ComparisonOperator": "GreaterThan"
                },
                "Goal": {
                    "Interval": {
                        "RollingInterval": {
                            "DurationUnit": "DAY",
                            "Duration": 1
                        }
                    },
                    "AttainmentGoal": 99.9,
                    "WarningThreshold": 30.0
                }
            }
        ],
        "Errors": []
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.