**To update the properties of an existing resource**

The following ``update-resource`` example updates the retention policy of an AWS::Logs::LogGroup resource named ExampleLogGroup to 90 days. ::

    aws cloudcontrol update-resource \
        --type-name AWS::Logs::LogGroup \
        --identifier ExampleLogGroup \
        --patch-document "[{\"op\":\"replace\",\"path\":\"/RetentionInDays\",\"value\":90}]"

Output::

    {
        "ProgressEvent": {
            "EventTime": "2021-08-09T18:17:15.219Z", 
            "TypeName": "AWS::Logs::LogGroup", 
            "OperationStatus": "IN_PROGRESS", 
            "Operation": "UPDATE", 
            "Identifier": "ExampleLogGroup", 
            "RequestToken": "5f40c577-3534-4b20-9599-0b0123456789"
        }
    }

For more information, see `Updating a resource <https://docs.aws.amazon.com/cloudcontrolapi/latest/userguide/resource-operations-update.html>`__ in the *Cloud Control API User Guide*.