**To retrieve a list of anomaly detection models**

The following ``describe-anomaly-detectors`` example displays information about anomaly detector models that are associated with the ``AWS/Logs`` namespace in the specified account. ::

    aws cloudwatch describe-anomaly-detectors \
        --namespace AWS/Logs

Output::

    {
        "AnomalyDetectors": [
            {
                "Namespace": "AWS/Logs",
                "MetricName": "IncomingBytes",
                "Dimensions": [],
                "Stat": "SampleCount",
                "Configuration": {
                    "ExcludedTimeRanges": []
                },
                "StateValue": "TRAINED",
                "SingleMetricAnomalyDetector": {
                    "AccountId": "123456789012",
                    "Namespace": "AWS/Logs",
                    "MetricName": "IncomingBytes",
                    "Dimensions": [],
                    "Stat": "SampleCount"
                }
            },
            {
                "Namespace": "AWS/Logs",
                "MetricName": "IncomingBytes",
                "Dimensions": [
                    {
                        "Name": "LogGroupName",
                        "Value": "demo"
                    }
                ],
                "Stat": "Average",
                "Configuration": {
                    "ExcludedTimeRanges": []
                },
                "StateValue": "PENDING_TRAINING",
                "SingleMetricAnomalyDetector": {
                    "AccountId": "123456789012",
                    "Namespace": "AWS/Logs",
                    "MetricName": "IncomingBytes",
                    "Dimensions": [
                        {
                            "Name": "LogGroupName",
                            "Value": "demo"
                        }
                    ],
                    "Stat": "Average"
                }
            }
        ]
    }

For more information, see `Using CloudWatch anomaly detection <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html>`__ in the *Amazon CloudWatch User Guide*.