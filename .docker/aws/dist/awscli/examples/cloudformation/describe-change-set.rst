**To get information about a change set**

The following ``describe-change-set`` example displays the details of the change set specified by change set name and stack name. ::

    aws cloudformation describe-change-set \
        --change-set-name my-change-set \
        --stack-name my-stack

The following ``describe-change-set`` example displays the details of the change set specified by the full ARN of the change set::

    aws cloudformation describe-change-set \
        --change-set-name arn:aws:cloudformation:us-west-2:123456789012:changeSet/my-change-set/bc9555ba-a949-xmpl-bfb8-f41d04ec5784

Output::

    {
        "Changes": [
            {
                "Type": "Resource",
                "ResourceChange": {
                    "Action": "Modify",
                    "LogicalResourceId": "function",
                    "PhysicalResourceId": "my-function-SEZV4XMPL4S5",
                    "ResourceType": "AWS::Lambda::Function",
                    "Replacement": "False",
                    "Scope": [
                        "Properties"
                    ],
                    "Details": [
                        {
                            "Target": {
                                "Attribute": "Properties",
                                "Name": "Timeout",
                                "RequiresRecreation": "Never"
                            },
                            "Evaluation": "Static",
                            "ChangeSource": "DirectModification"
                        }
                    ]
                }
            }
        ],
        "ChangeSetName": "my-change-set",
        "ChangeSetId": "arn:aws:cloudformation:us-west-2:123456789012:changeSet/my-change-set/4eca1a01-e285-xmpl-8026-9a1967bfb4b0",
        "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
        "StackName": "my-stack",
        "Description": null,
        "Parameters": null,
        "CreationTime": "2019-10-02T05:20:56.651Z",
        "ExecutionStatus": "AVAILABLE",
        "Status": "CREATE_COMPLETE",
        "StatusReason": null,
        "NotificationARNs": [],
        "RollbackConfiguration": {},
        "Capabilities": [
            "CAPABILITY_IAM"
        ],
        "Tags": null
    }
