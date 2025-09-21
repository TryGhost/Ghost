**To list the invocations of a specific command**

The following ``list-command-invocations`` example lists all the invocations of a command. ::

    aws ssm list-command-invocations \
        --command-id "ef7fdfd8-9b57-4151-a15c-db9a12345678" \
        --details

Output::

    {
        "CommandInvocations": [
            {
                "CommandId": "ef7fdfd8-9b57-4151-a15c-db9a12345678",
                "InstanceId": "i-02573cafcfEXAMPLE",
                "InstanceName": "",
                "Comment": "b48291dd-ba76-43e0-b9df-13e11ddaac26:6960febb-2907-4b59-8e1a-d6ce8EXAMPLE",
                "DocumentName": "AWS-UpdateSSMAgent",
                "DocumentVersion": "",
                "RequestedDateTime": 1582136283.089,
                "Status": "Success",
                "StatusDetails": "Success",
                "StandardOutputUrl": "",
                "StandardErrorUrl": "",
                "CommandPlugins": [
                    {
                        "Name": "aws:updateSsmAgent",
                        "Status": "Success",
                        "StatusDetails": "Success",
                        "ResponseCode": 0,
                        "ResponseStartDateTime": 1582136283.419,
                        "ResponseFinishDateTime": 1582136283.51,
                        "Output": "Updating amazon-ssm-agent from 2.3.842.0 to latest\nSuccessfully downloaded https://s3.us-east-2.amazonaws.com/amazon-ssm-us-east-2/ssm-agent-manifest.json\namazon-ssm-agent 2.3.842.0 has already been installed, update skipped\n",
                        "StandardOutputUrl": "",
                        "StandardErrorUrl": "",
                        "OutputS3Region": "us-east-2",
                        "OutputS3BucketName": "",
                        "OutputS3KeyPrefix": ""
                    }
                ],
                "ServiceRole": "",
                "NotificationConfig": {
                    "NotificationArn": "",
                    "NotificationEvents": [],
                    "NotificationType": ""
                },
                "CloudWatchOutputConfig": {
                    "CloudWatchLogGroupName": "",
                    "CloudWatchOutputEnabled": false
                }
            },
            {
                "CommandId": "ef7fdfd8-9b57-4151-a15c-db9a12345678",
                "InstanceId": "i-0471e04240EXAMPLE",
                "InstanceName": "",
                "Comment": "b48291dd-ba76-43e0-b9df-13e11ddaac26:6960febb-2907-4b59-8e1a-d6ce8EXAMPLE",
                "DocumentName": "AWS-UpdateSSMAgent",
                "DocumentVersion": "",
                "RequestedDateTime": 1582136283.02,
                "Status": "Success",
                "StatusDetails": "Success",
                "StandardOutputUrl": "",
                "StandardErrorUrl": "",
                "CommandPlugins": [
                    {
                        "Name": "aws:updateSsmAgent",
                        "Status": "Success",
                        "StatusDetails": "Success",
                        "ResponseCode": 0,
                        "ResponseStartDateTime": 1582136283.812,
                        "ResponseFinishDateTime": 1582136295.031,
                        "Output": "Updating amazon-ssm-agent from 2.3.672.0 to latest\nSuccessfully downloaded https://s3.us-east-2.amazonaws.com/amazon-ssm-us-east-2/ssm-agent-manifest.json\nSuccessfully downloaded https://s3.us-east-2.amazonaws.com/amazon-ssm-us-east-2/amazon-ssm-agent-updater/2.3.842.0/amazon-ssm-agent-updater-snap-amd64.tar.gz\nSuccessfully downloaded https://s3.us-east-2.amazonaws.com/amazon-ssm-us-east-2/amazon-ssm-agent/2.3.672.0/amazon-ssm-agent-snap-amd64.tar.gz\nSuccessfully downloaded https://s3.us-east-2.amazonaws.com/amazon-ssm-us-east-2/amazon-ssm-agent/2.3.842.0/amazon-ssm-agent-snap-amd64.tar.gz\nInitiating amazon-ssm-agent update to 2.3.842.0\namazon-ssm-agent updated successfully to 2.3.842.0",
                        "StandardOutputUrl": "",
                        "StandardErrorUrl": "",
                        "OutputS3Region": "us-east-2",
                        "OutputS3BucketName": "",
                        "OutputS3KeyPrefix": "8bee3135-398c-4d31-99b6-e42d2EXAMPLE/i-0471e04240EXAMPLE/awsupdateSsmAgent"
                    }
                ],
                "ServiceRole": "",
                "NotificationConfig": {
                    "NotificationArn": "",
                    "NotificationEvents": [],
                    "NotificationType": ""
                },
                "CloudWatchOutputConfig": {
                    "CloudWatchLogGroupName": "",
                    "CloudWatchOutputEnabled": false
                }
            }
        ]
    }

For more information, see `Understanding Command Statuses <https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html>`__ in the *AWS Systems Manager User Guide*.