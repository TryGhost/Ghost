**To return information about one SLO created in the account**

The following ``get-service-level-objective`` example returns information about one SLO created in the account. ::

    aws application-signals get-service-level-objective \
        --id "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName" 

Output::

    {
        "Slo": {
            "Arn": "arn:aws:application-signals:us-east-1:123456789101:slo/SLOName",
            "Name": "SLOName",
            "Description": "Description of your SLO",
            "CreatedTime": "2024-12-24T22:19:18.624000+05:30",
            "LastUpdatedTime": "2024-12-24T22:19:55.280000+05:30",
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
                                    "Value": "i-0e0987654321522"
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
                "AttainmentGoal": 99.0,
                "WarningThreshold": 50.0
            }
        }
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.