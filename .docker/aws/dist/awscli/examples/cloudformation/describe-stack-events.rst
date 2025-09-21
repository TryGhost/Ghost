**To describe stack events**

The following ``describe-stack-events`` example displays the 2 most recent events for the specified stack. ::

    aws cloudformation describe-stack-events \
        --stack-name my-stack \
        --max-items 2

    {
        "StackEvents": [
            {
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "EventId": "4e1516d0-e4d6-xmpl-b94f-0a51958a168c",
                "StackName": "my-stack",
                "LogicalResourceId": "my-stack",
                "PhysicalResourceId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "ResourceType": "AWS::CloudFormation::Stack",
                "Timestamp": "2019-10-02T05:34:29.556Z",
                "ResourceStatus": "UPDATE_COMPLETE"
            },
            {
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "EventId": "4dd3c810-e4d6-xmpl-bade-0aaf8b31ab7a",
                "StackName": "my-stack",
                "LogicalResourceId": "my-stack",
                "PhysicalResourceId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
                "ResourceType": "AWS::CloudFormation::Stack",
                "Timestamp": "2019-10-02T05:34:29.127Z",
                "ResourceStatus": "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS"
            }
        ],
        "NextToken": "eyJOZXh0VG9XMPLiOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyfQ=="
    }
