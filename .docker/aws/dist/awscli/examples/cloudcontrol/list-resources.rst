**To list the resources of a given type**

The following ``list-resources`` example lists the AWS::Kinesis::Stream resources provisioned in your AWS account. ::

    aws cloudcontrol list-resources \
        --type-name AWS::Kinesis::Stream
 
Output::

    {
        "TypeName": "AWS::Kinesis::Stream", 
        "ResourceDescriptions": [
            {
                "Identifier": "MyKinesisStream", 
                "Properties": "{\"Name\":\"MyKinesisStream\"}"
            }, 
            {
                "Identifier": "AnotherStream", 
                "Properties": "{\"Name\":\"AnotherStream\"}"
            }
        ]
    }

For more information, see `Discovering resources <https://docs.aws.amazon.com/cloudcontrolapi/latest/userguide/resource-operations-list.html>`__ in the *Cloud Control API User Guide*.