**Example 1: To describe all steps for an automation execution**

The following ``describe-automation-step-executions`` example displays details about the steps of an Automation execution. ::

    aws ssm describe-automation-step-executions \
        --automation-execution-id 73c8eef8-f4ee-4a05-820c-e354fEXAMPLE

Output::

    {
        "StepExecutions": [
            {
                "StepName": "startInstances",
                "Action": "aws:changeInstanceState",
                "ExecutionStartTime": 1583737234.134,
                "ExecutionEndTime": 1583737234.672,
                "StepStatus": "Success",
                "Inputs": {
                    "DesiredState": "\"running\"",
                    "InstanceIds": "[\"i-0cb99161f6EXAMPLE\"]"
                },
                "Outputs": {
                    "InstanceStates": [
                        "running"
                    ]
                },
                "StepExecutionId": "95e70479-cf20-4d80-8018-7e4e2EXAMPLE",
                "OverriddenParameters": {}
            }
        ]
    }

**Example 2: To describe a specific step for an automation execution**

The following ``describe-automation-step-executions`` example displays details about a specific step of an Automation execution. ::

    aws ssm describe-automation-step-executions \
        --automation-execution-id 73c8eef8-f4ee-4a05-820c-e354fEXAMPLE \
        --filters Key=StepExecutionId,Values=95e70479-cf20-4d80-8018-7e4e2EXAMPLE

For more information, see `Running an Automation Workflow Step by Step (Command Line) <https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-working-executing-manually.html#automation-working-executing-manually-commandline>`__ in the *AWS Systems Manager User Guide*.
