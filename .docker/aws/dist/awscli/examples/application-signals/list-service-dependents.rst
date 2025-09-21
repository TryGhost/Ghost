**To return the list of dependents that invoked the specified service during the provided time range**

The following ``list-service-dependents`` example returns the list of dependents that invoked the specified service during the provided time range. ::

    aws application-signals list-service-dependents \
        --start-time 1732021200 \
        --end-time 1732107600 \
        --key-attributes Environment=generic:default,Name=PetSite,Type=Service

Output::

    {
        "ServiceDependents": [{
            "OperationName": "",
            "DependentKeyAttributes": {
                "Identifier": "pet-api-canary-hao",
                "ResourceType": "AWS::Synthetics::Canary",
                "Type": "AWS::Resource"
            },
            "DependentOperationName": "",
            "MetricReferences": []
        }, {
            "OperationName": "",
            "DependentKeyAttributes": {
                "Identifier": "PetSite",
                "ResourceType": "AWS::Synthetics::Canary",
                "Type": "AWS::Resource"
            },
            "DependentOperationName": "",
            "MetricReferences": []
        }],
        "StartTime": "2024-12-24T05:00:00+00:00",
        "EndTime": "2024-12-25T06:00:01+00:00"
    }

For more information, see `Application Signals <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html>`__ in the *Amazon CloudWatch User Guide*.