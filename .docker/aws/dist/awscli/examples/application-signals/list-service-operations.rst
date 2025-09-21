**To return a list of the operations of this service that have been discovered by Application Signals**

The following ``list-service-operations`` example returns a list of the operations of this service that have been discovered by Application Signals. ::

    aws application-signals list-service-operations \
        --start-time 1735017423 \
        --end-time 1735103823 \
        --key-attributes Environment=generic:default,Name=payforadoption,Type=Service

Output::

    {
        "ServiceOperations": [{
            "Name": "POST /api",
            "MetricReferences": [{
                "Namespace": "ApplicationSignals",
                "MetricType": "LATENCY",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "generic:default"
                }, {
                    "Name": "Operation",
                    "Value": "POST /api"
                }, {
                    "Name": "Service",
                    "Value": "payforadoption"
                }],
                "MetricName": "Latency"
            }, {
                "Namespace": "ApplicationSignals",
                "MetricType": "FAULT",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "generic:default"
                }, {
                    "Name": "Operation",
                    "Value": "POST /api"
                }, {
                    "Name": "Service",
                    "Value": "payforadoption"
                }],
                "MetricName": "Fault"
            }, {
                "Namespace": "ApplicationSignals",
                "MetricType": "ERROR",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "generic:default"
                }, {
                    "Name": "Operation",
                    "Value": "POST /api"
                }, {
                    "Name": "Service",
                    "Value": "payforadoption"
                }],
                "MetricName": "Error"
            }]
        }],
        "StartTime": "2024-12-24T05:00:00+00:00",
        "EndTime": "2024-12-25T06:00:01+00:00"
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.