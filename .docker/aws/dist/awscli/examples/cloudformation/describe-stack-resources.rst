**To get information about a stack resource**

The following ``describe-stack-resources`` example displays details for the resources in the specified stack. ::

    aws cloudformation describe-stack-resources \
        --stack-name my-stack

Output::

    {
        "StackResources": [
            {
                "StackName": "my-stack",
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "LogicalResourceId": "bucket",
                "PhysicalResourceId": "my-stack-bucket-1vc62xmplgguf",
                "ResourceType": "AWS::S3::Bucket",
                "Timestamp": "2019-10-02T04:34:11.345Z",
                "ResourceStatus": "CREATE_COMPLETE",
                "DriftInformation": {
                    "StackResourceDriftStatus": "IN_SYNC"
                }
            },
            {
                "StackName": "my-stack",
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "LogicalResourceId": "function",
                "PhysicalResourceId": "my-function-SEZV4XMPL4S5",
                "ResourceType": "AWS::Lambda::Function",
                "Timestamp": "2019-10-02T05:34:27.989Z",
                "ResourceStatus": "UPDATE_COMPLETE",
                "DriftInformation": {
                    "StackResourceDriftStatus": "IN_SYNC"
                }
            },
            {
                "StackName": "my-stack",
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "LogicalResourceId": "functionRole",
                "PhysicalResourceId": "my-functionRole-HIZXMPLEOM9E",
                "ResourceType": "AWS::IAM::Role",
                "Timestamp": "2019-10-02T04:34:06.350Z",
                "ResourceStatus": "CREATE_COMPLETE",
                "DriftInformation": {
                    "StackResourceDriftStatus": "IN_SYNC"
                }
            }
        ]
    }
