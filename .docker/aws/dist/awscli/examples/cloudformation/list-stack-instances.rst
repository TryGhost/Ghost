**To list instances for a stack**

The following ``list-stack-instances`` example lists the instances created from the specified stack set. ::

    aws cloudformation list-stack-instances \
        --stack-set-name enable-config

The example output includes details about a stack that failed to update due to an error::

    {
        "Summaries": [
            {
                "StackSetId": "enable-config:296a3360-xmpl-40af-be78-9341e95bf743",
                "Region": "us-west-2",
                "Account": "123456789012",
                "StackId": "arn:aws:cloudformation:ap-northeast-1:123456789012:stack/StackSet-enable-config-35a6ac50-d9f8-4084-86e4-7da34d5de4c4/a1631cd0-e5fb-xmpl-b474-0aa20f14f06e",
                "Status": "CURRENT"
            },
            {
                "StackSetId": "enable-config:296a3360-xmpl-40af-be78-9341e95bf743",
                "Region": "us-west-2",
                "Account": "123456789012",
                "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/StackSet-enable-config-e6cac20f-xmpl-46e9-8314-53e0d4591532/eab53680-e5fa-xmpl-ba14-0a522351f81e",
                "Status": "OUTDATED",
                "StatusReason": "ResourceLogicalId:ConfigDeliveryChannel, ResourceType:AWS::Config::DeliveryChannel, ResourceStatusReason:Failed to put delivery channel 'StackSet-enable-config-e6cac20f-xmpl-46e9-8314-53e0d4591532-ConfigDeliveryChannel-1OJWJ7XD59WR0' because the maximum number of delivery channels: 1 is reached. (Service: AmazonConfig; Status Code: 400; Error Code: MaxNumberOfDeliveryChannelsExceededException; Request ID: d14b34a0-ef7c-xmpl-acf8-8a864370ae56)."
            }
        ]
    }
