**To get information about a stack resource**

The following ``describe-stack-resource`` example displays details for the resource named ``MyFunction`` in the specified stack. ::

    aws cloudformation describe-stack-resource \
        --stack-name MyStack \
        --logical-resource-id MyFunction

Output::

    {
        "StackResourceDetail": {
            "StackName": "MyStack",
            "StackId": "arn:aws:cloudformation:us-east-2:123456789012:stack/MyStack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
            "LogicalResourceId": "MyFunction",
            "PhysicalResourceId": "my-function-SEZV4XMPL4S5",
            "ResourceType": "AWS::Lambda::Function",
            "LastUpdatedTimestamp": "2019-10-02T05:34:27.989Z",
            "ResourceStatus": "UPDATE_COMPLETE",
            "Metadata": "{}",
            "DriftInformation": {
                "StackResourceDriftStatus": "IN_SYNC"
            }
        }
    }
