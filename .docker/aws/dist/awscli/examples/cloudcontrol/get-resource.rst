**To get the current state of a resource**

The following ``get-resource`` example returns the current state of the AWS::Kinesis::Stream resource named ResourceExample. ::

    aws cloudcontrol get-resource \
        --type-name AWS::Kinesis::Stream \
        --identifier ResourceExample

Output::

    {
        "TypeName": "AWS::Kinesis::Stream", 
        "ResourceDescription": {
            "Identifier": "ResourceExample", 
            "Properties": "{\"Arn\":\"arn:aws:kinesis:us-west-2:099908667365:stream/ResourceExample\",\"RetentionPeriodHours\":168,\"Name\":\"ResourceExample\",\"ShardCount\":3}"
        }
    }

For more information, see `Reading a resource's current state <https://docs.aws.amazon.com/cloudcontrolapi/latest/userguide/resource-operations-read.html>`__ in the *Cloud Control API User Guide*.