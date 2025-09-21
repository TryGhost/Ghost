**To list resources in a stack**

The following command displays the list of resources in the specified stack. ::

    aws cloudformation list-stack-resources \
        --stack-name my-stack

Output::

    {
        "StackResourceSummaries": [
            {
                "LogicalResourceId": "bucket",
                "PhysicalResourceId": "my-stack-bucket-1vc62xmplgguf",
                "ResourceType": "AWS::S3::Bucket",
                "LastUpdatedTimestamp": "2019-10-02T04:34:11.345Z",
                "ResourceStatus": "CREATE_COMPLETE",
                "DriftInformation": {
                    "StackResourceDriftStatus": "IN_SYNC"
                }
            },
            {
                "LogicalResourceId": "function",
                "PhysicalResourceId": "my-function-SEZV4XMPL4S5",
                "ResourceType": "AWS::Lambda::Function",
                "LastUpdatedTimestamp": "2019-10-02T05:34:27.989Z",
                "ResourceStatus": "UPDATE_COMPLETE",
                "DriftInformation": {
                    "StackResourceDriftStatus": "IN_SYNC"
                }
            },
            {
                "LogicalResourceId": "functionRole",
                "PhysicalResourceId": "my-functionRole-HIZXMPLEOM9E",
                "ResourceType": "AWS::IAM::Role",
                "LastUpdatedTimestamp": "2019-10-02T04:34:06.350Z",
                "ResourceStatus": "CREATE_COMPLETE",
                "DriftInformation": {
                    "StackResourceDriftStatus": "IN_SYNC"
                }
            }
        ]
    }
