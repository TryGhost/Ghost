**To get information about a maintenance window task**

The following ``get-maintenance-window-task`` example retreives details about the specified maintenance window task. ::

    aws ssm get-maintenance-window-task \
        --window-id mw-0c5ed765acEXAMPLE \
        --window-task-id 0e842a8d-2d44-4886-bb62-af8dcEXAMPLE

Output::

    {
        "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
        "MaxErrors": "1",
        "TaskArn": "AWS-RunPowerShellScript",
        "MaxConcurrency": "1",
        "WindowTaskId": "0e842a8d-2d44-4886-bb62-af8dcEXAMPLE",
        "TaskParameters": {},
        "Priority": 1,
        "TaskInvocationParameters": {
            "RunCommand": {
                "Comment": "",
                "TimeoutSeconds": 600,
                "Parameters": {
                    "commands": [
                        "echo Hello"
                    ],
                    "executionTimeout": [
                        "3600"
                    ],
                    "workingDirectory": [
                        ""
                    ]
                }
            }
        },
        "WindowId": "mw-0c5ed765acEXAMPLE",
        "TaskType": "RUN_COMMAND",
        "Targets": [
            {
                "Values": [
                    "84c818da-b619-4d3d-9651-946f3EXAMPLE"
                ],
                "Key": "WindowTargetIds"
            }
        ],
        "Name": "ExampleTask"
    }

For more information, see `View Information About Maintenance Windows (AWS CLI)  <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-describe.html>`__ in the *AWS Systems Manager User Guide*.
