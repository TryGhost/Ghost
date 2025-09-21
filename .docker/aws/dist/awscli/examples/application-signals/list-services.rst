**To return a list of services that have been discovered by Application Signals**

The following ``list-services`` example returns a list of services that have been discovered by Application Signals. ::

    aws application-signals list-services \
        --start-time 1734918791 \
        --end-time 1734965591

Output::

    {
        "ServiceSummaries": [{
            "KeyAttributes": {
                "Environment": "lambda:default",
                "Name": "hello-world-python",
                "Type": "Service"
            },
            "AttributeMaps": [{
                "Lambda.Function.Name": "hello-world-python",
                "PlatformType": "AWS::Lambda"
            }],
            "MetricReferences": [{
                "Namespace": "ApplicationSignals",
                "MetricType": "LATENCY",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "lambda:default"
                }, {
                    "Name": "Service",
                    "Value": "hello-world-python"
                }],
                "MetricName": "Latency"
            }, {
                "Namespace": "ApplicationSignals",
                "MetricType": "FAULT",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "lambda:default"
                }, {
                    "Name": "Service",
                    "Value": "hello-world-python"
                }],
                "MetricName": "Fault"
            }, {
                "Namespace": "ApplicationSignals",
                "MetricType": "ERROR",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "lambda:default"
                }, {
                    "Name": "Service",
                    "Value": "hello-world-python"
                }],
                "MetricName": "Error"
            }]
        }],
        "StartTime": "2024-11-27T10:00:00+00:00",
        "EndTime": "2024-11-27T14:00:01+00:00"
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.