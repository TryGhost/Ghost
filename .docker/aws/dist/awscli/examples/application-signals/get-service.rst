**To return information about a service discovered by Application Signals**

The following ``get-service`` example returns information about a service discovered by Application Signals. ::

    aws application-signals get-service \
        --start-time 1732704000 \
        --end-time 1732714500 \
        --key-attributes Environment=lambda:default,Name=hello-world-python,Type=Service

Output::

    {
        "Service": {
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
            }],
            "LogGroupReferences": [{
                "Identifier": "/aws/lambda/hello-world-python",
                "ResourceType": "AWS::Logs::LogGroup",
                "Type": "AWS::Resource"
            }]
        },
        "StartTime": "2024-11-27T10:00:00+00:00",
        "EndTime": "2024-11-27T14:00:01+00:00",
        "LogGroupReferences": [{
            "Identifier": "/aws/lambda/hello-world-python",
            "ResourceType": "AWS::Logs::LogGroup",
            "Type": "AWS::Resource"
        }]
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.