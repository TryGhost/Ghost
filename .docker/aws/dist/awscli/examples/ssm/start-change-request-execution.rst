**Example 1: To start a change request**

The following ``start-change-request-execution`` example starts a change request with minimal options specified. ::

    aws ssm start-change-request-execution \
        --change-request-name MyChangeRequest \
        --document-name AWS-HelloWorldChangeTemplate \
        --runbooks '[{"DocumentName": "AWS-HelloWorld","Parameters": {"AutomationAssumeRole": ["arn:aws:iam:us-east-2:1112223233444:role/MyChangeManagerAssumeRole"]}}]' \
        --parameters Approver="JohnDoe",ApproverType="IamUser",ApproverSnsTopicArn="arn:aws:sns:us-east-2:1112223233444:MyNotificationTopic"

Output::

    {
      "AutomationExecutionId": "9d32a4fc-f944-11e6-4105-0a1b2EXAMPLE"
    }

**Example 2: To start a change request using an external JSON file**

The following ``start-automation-execution`` example starts a change request with multiple options specified in a JSON file. ::

    aws ssm start-change-request-execution \
        --cli-input-json file://MyChangeRequest.json

Contents of ``MyChangeRequest.json``::

    {
        "ChangeRequestName": "MyChangeRequest",
        "DocumentName": "AWS-HelloWorldChangeTemplate",
        "DocumentVersion": "$DEFAULT",
        "ScheduledTime": "2021-12-30T03:00:00",
        "ScheduledEndTime": "2021-12-30T03:05:00",
        "Tags": [
            {
                "Key": "Purpose",
                "Value": "Testing"
            }
        ],
        "Parameters": {
            "Approver": [
                "JohnDoe"
            ],
            "ApproverType": [
                "IamUser"
            ],
            "ApproverSnsTopicArn": [
                "arn:aws:sns:us-east-2:111222333444;:MyNotificationTopic
            ]
        },
        "Runbooks": [
            {
                "DocumentName": "AWS-HelloWorld",
                "DocumentVersion": "1",
                "MaxConcurrency": "1",
                "MaxErrors": "1",
                "Parameters": {
                    "AutomationAssumeRole": [
                        "arn:aws:iam::111222333444:role/MyChangeManagerAssumeRole"
                    ]
                }
            }
        ],
        "ChangeDetails": "### Document Name: HelloWorldChangeTemplate\n\n## What does this document do?\nThis change template demonstrates the feature set available for creating change templates for Change Manager. This template starts a Runbook workflow for the Automation document called AWS-HelloWorld.\n\n## Input Parameters\n* ApproverSnsTopicArn: (Required) Amazon Simple Notification Service ARN for approvers.\n* Approver: (Required) The name of the approver to send this request to.\n* ApproverType: (Required) The type of reviewer.\n  * Allowed Values: IamUser, IamGroup, IamRole, SSOGroup, SSOUser\n\n## Output Parameters\nThis document has no outputs \n"
    }

Output::

    {
      "AutomationExecutionId": "9d32a4fc-f944-11e6-4105-0a1b2EXAMPLE"
    }

For more information, see `Creating change requests <https://docs.aws.amazon.com/systems-manager/latest/userguide/change-requests-create.html>`__ in the *AWS Systems Manager User Guide*.