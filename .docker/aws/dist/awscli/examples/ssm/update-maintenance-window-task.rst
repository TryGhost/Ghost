**To update a maintenance window task**

The following ``update-maintenance-window-task`` example updates the service role for a maintenance window task. ::

    aws ssm update-maintenance-window-task \
        --window-id "mw-0c5ed765acEXAMPLE" \
        --window-task-id "23d3809e-9fbe-4ddf-b41a-b49d7EXAMPLE" \
        --service-role-arn "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM"

Output::

    {
        "ServiceRoleArn": "arn:aws:iam::111222333444:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM",
        "MaxErrors": "1",
        "TaskArn": "AWS-UpdateEC2Config",
        "MaxConcurrency": "1",
        "WindowTaskId": "23d3809e-9fbe-4ddf-b41a-b49d7EXAMPLE",
        "TaskParameters": {},
        "Priority": 1,
        "TaskInvocationParameters": {
            "RunCommand": {
                "TimeoutSeconds": 600,
                "Parameters": {
                    "allowDowngrade": [
                        "false"
                    ]
                }
            }
        },
        "WindowId": "mw-0c5ed765acEXAMPLE",
        "Description": "UpdateEC2Config",
        "Targets": [
            {
                "Values": [
                    "57e8344e-fe64-4023-8191-6bf05EXAMPLE"
                ],
                "Key": "WindowTargetIds"
            }
        ],
        "Name": "UpdateEC2Config"
    }

For more information, see `Update a Maintenance Window (AWS CLI)  <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-update.html>`__ in the *AWS Systems Manager User Guide*.
