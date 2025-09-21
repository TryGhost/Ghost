**To return a list of service dependencies of the service that you specify**

The following ``list-service-dependencies`` example returns a list of service dependencies of the service that you specify. ::

    aws application-signals list-service-dependencies \
        --start-time 1732021200 \
        --end-time 1732107600 \
        --key-attributes Environment=api-gateway:prod, Name=PetAdoptionStatusUpdater,Type=Service

Output::

    {
        "ServiceDependencies": [{
            "OperationName": "PUT /prod",
            "DependencyKeyAttributes": {
                "Environment": "lambda:default",
                "Name": "Services-name",
                "Type": "Service"
            },
            "DependencyOperationName": "Invoke",
            "MetricReferences": [{
                "Namespace": "ApplicationSignals",
                "MetricType": "LATENCY",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "api-gateway:prod"
                }, {
                    "Name": "Operation",
                    "Value": "PUT /prod"
                }, {
                    "Name": "RemoteEnvironment",
                    "Value": "lambda:default"
                }, {
                    "Name": "RemoteOperation",
                    "Value": "Invoke"
                }, {
                    "Name": "RemoteService",
                    "Value": "Services-name"
                }, {
                    "Name": "Service",
                    "Value": "PetAdoptionStatusUpdater"
                }],
                "MetricName": "Latency"
            }, {
                "Namespace": "ApplicationSignals",
                "MetricType": "FAULT",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "api-gateway:prod"
                }, {
                    "Name": "Operation",
                    "Value": "PUT /prod"
                }, {
                    "Name": "RemoteEnvironment",
                    "Value": "lambda:default"
                }, {
                    "Name": "RemoteOperation",
                    "Value": "Invoke"
                }, {
                    "Name": "RemoteService",
                    "Value": "Services-name"
                }, {
                    "Name": "Service",
                    "Value": "PetAdoptionStatusUpdater"
                }],
                "MetricName": "Fault"
            }, {
                "Namespace": "ApplicationSignals",
                "MetricType": "ERROR",
                "Dimensions": [{
                    "Name": "Environment",
                    "Value": "api-gateway:prod"
                }, {
                    "Name": "Operation",
                    "Value": "PUT /prod"
                }, {
                    "Name": "RemoteEnvironment",
                    "Value": "lambda:default"
                }, {
                    "Name": "RemoteOperation",
                    "Value": "Invoke"
                }, {
                    "Name": "RemoteService",
                    "Value": "Services-name"
                }, {
                    "Name": "Service",
                    "Value": "PetAdoptionStatusUpdater"
                }],
                "MetricName": "Error"
            }]
        }],
        "StartTime": "2024-11-19T13:00:00+00:00",
        "EndTime": "2024-11-20T13:00:01+00:00"
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.