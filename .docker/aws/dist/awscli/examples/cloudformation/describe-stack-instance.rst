**To describe a stack instance**

The following command describes an instance of the specified stack set in the specified account and Region. The stack set is in the current region and account, and the instance is in the ``us-west-2`` region in account ``123456789012``.::

    aws cloudformation describe-stack-instance \
        --stack-set-name my-stack-set \
        --stack-instance-account 123456789012 \
        --stack-instance-region us-west-2

Output::

    {
        "StackInstance": {
            "StackSetId": "enable-config:296a3360-xmpl-40af-be78-9341e95bf743",
            "Region": "us-west-2",
            "Account": "123456789012",
            "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/StackSet-enable-config-e6cac20f-xmpl-46e9-8314-53e0d4591532/4287f9a0-e615-xmpl-894a-12b31d3117be",
            "ParameterOverrides": [],
            "Status": "OUTDATED",
            "StatusReason": "ResourceLogicalId:ConfigBucket, ResourceType:AWS::S3::Bucket, ResourceStatusReason:You have attempted to create more buckets than allowed (Service: Amazon S3; Status Code: 400; Error Code: TooManyBuckets; Request ID: F7F21CXMPL580224; S3 Extended Request ID: egd/Fdt89BXMPLyiqbMNljVk55Yqqvi3NYW2nKLUVWhUGEhNfCmZdyj967lhriaG/dWMobSO40o=)."
        }
    }
