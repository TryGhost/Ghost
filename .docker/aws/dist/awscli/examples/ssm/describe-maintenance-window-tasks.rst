**Example 1: To list all tasks for a maintenance window**

The following ``describe-maintenance-window-tasks`` example lists all of the tasks for the specified maintenance window. ::

    aws ssm describe-maintenance-window-tasks \
        --window-id "mw-06cf17cbefEXAMPLE"

Output::

    {
        "Tasks": [
            {
                "WindowId": "mw-06cf17cbefEXAMPLE",
                "WindowTaskId": "018b31c3-2d77-4b9e-bd48-c91edEXAMPLE",
                "TaskArn": "AWS-RestartEC2Instance",
                "TaskParameters": {},
                "Type": "AUTOMATION",
                "Description": "Restarting EC2 Instance for maintenance",
                "MaxConcurrency": "1",
                "MaxErrors": "1",
                "Name": "My-Automation-Example-Task",
                "Priority": 0,
                "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
                "Targets": [
                    {
                        "Key": "WindowTargetIds",
                        "Values": [
                            "da89dcc3-7f9c-481d-ba2b-edcb7EXAMPLE"
                        ]
                    }
                ]
            },
            {
                "WindowId": "mw-06cf17cbefEXAMPLE",
                "WindowTaskId": "1943dee0-0a17-4978-9bf4-3cc2fEXAMPLE",
                "TaskArn": "AWS-DisableS3BucketPublicReadWrite",
                "TaskParameters": {},
                "Type": "AUTOMATION",
                "Description": "Automation task to disable read/write access on public S3 buckets",
                "MaxConcurrency": "10",
                "MaxErrors": "5",
                "Name": "My-Disable-S3-Public-Read-Write-Access-Automation-Task",
                "Priority": 0,
                "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
                "Targets": [
                    {
                        "Key": "WindowTargetIds",
                        "Values": [
                            "da89dcc3-7f9c-481d-ba2b-edcb7EXAMPLE"
                        ]
                    }
                ]
            }
        ]
    }

**Example 2: To list all tasks for a maintenance window that invokes the AWS-RunPowerShellScript command document**

The following ``describe-maintenance-window-tasks`` example lists all of the tasks for the specified maintenance window that invokes the ``AWS-RunPowerShellScript`` command document. ::

    aws ssm describe-maintenance-window-tasks \
        --window-id "mw-ab12cd34eEXAMPLE" \
        --filters "Key=TaskArn,Values=AWS-RunPowerShellScript"

Output::

    {
        "Tasks": [
            {
                "WindowId": "mw-ab12cd34eEXAMPLE",
                "WindowTaskId": "0d36e6b4-3a4f-411e-adcb-3558eEXAMPLE",
                "TaskArn": "AWS-RunPowerShellScript",
                "Type": "RUN_COMMAND",
                "Targets": [
                    {
                        "Key": "WindowTargetIds",
                        "Values": [
                            "da89dcc3-7f9c-481d-ba2b-edcb7EXAMPLE"
                        ]
                    }
                ],
                "TaskParameters": {},
                "Priority": 1,
                "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
                "MaxConcurrency": "1",
                "MaxErrors": "1",
                "Name": "MyTask"
            }
        ]
    }

**Example 3: To list all tasks for a maintenance window that have a Priority of 3**

The following ``describe-maintenance-window-tasks`` example lists all of the tasks for the specified maintenance window that have a ``Priority`` of ``3``. ::

    aws ssm describe-maintenance-window-tasks \
        --window-id "mw-ab12cd34eEXAMPLE" \
        --filters "Key=Priority,Values=3"    

Output::

    {
        "Tasks": [
            {
                "WindowId": "mw-ab12cd34eEXAMPLE",
                "WindowTaskId": "0d36e6b4-3a4f-411e-adcb-3558eEXAMPLE",
                "TaskArn": "AWS-RunPowerShellScript",
                "Type": "RUN_COMMAND",
                "Targets": [
                    {
                        "Key": "WindowTargetIds",
                        "Values": [
                            "da89dcc3-7f9c-481d-ba2b-edcb7EXAMPLE"
                        ]
                    }
                ],
                "TaskParameters": {},
                "Priority": 3,
                "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
                "MaxConcurrency": "1",
                "MaxErrors": "1",
                "Name": "MyRunCommandTask"
            },
            {
                "WindowId": "mw-ab12cd34eEXAMPLE",
                "WindowTaskId": "ee45feff-ad65-4a6c-b478-5cab8EXAMPLE",
                "TaskArn": "AWS-RestartEC2Instance",
                "Type": "AUTOMATION",
                "Targets": [
                    {
                        "Key": "WindowTargetIds",
                        "Values": [
                            "da89dcc3-7f9c-481d-ba2b-edcb7EXAMPLE"
                        ]
                    }
                ],
                "TaskParameters": {},
                "Priority": 3,
                "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
                "MaxConcurrency": "10",
                "MaxErrors": "5",
                "Name": "My-Automation-Task",
                "Description": "A description for my Automation task"
            }
        ]
    }

**Example 4: To list all tasks for a maintenance window that have a Priority of 1 and use Run Command**

This ``describe-maintenance-window-tasks`` example lists all of the tasks for the specified maintenance window that have a ``Priority`` of ``1`` and use ``Run Command``. ::

    aws ssm describe-maintenance-window-tasks \
        --window-id "mw-ab12cd34eEXAMPLE" \
        --filters "Key=Priority,Values=1" "Key=TaskType,Values=RUN_COMMAND"

Output::

    {
        "Tasks": [
            {
                "WindowId": "mw-ab12cd34eEXAMPLE",
                "WindowTaskId": "0d36e6b4-3a4f-411e-adcb-3558eEXAMPLE",
                "TaskArn": "AWS-RunPowerShellScript",
                "Type": "RUN_COMMAND",
                "Targets": [
                    {
                        "Key": "WindowTargetIds",
                        "Values": [
                            "da89dcc3-7f9c-481d-ba2b-edcb7EXAMPLE"
                        ]
                    }
                ],
                "TaskParameters": {},
                "Priority": 1,
                "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
                "MaxConcurrency": "1",
                "MaxErrors": "1",
                "Name": "MyRunCommandTask"
            }
        ]
    }

For more information, see `View information about maintenance windows (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-describe.html>`__ in the *AWS Systems Manager User Guide*.