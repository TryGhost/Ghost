**To get information about a maintenance window task invocation**

The following ``get-maintenance-window-execution-task-invocation`` example lists information about the specified task invocation that is part of the specified maintenance window execution. ::

    aws ssm get-maintenance-window-execution-task-invocation \
        --window-execution-id "bc494bfa-e63b-49f6-8ad1-aa9f2EXAMPLE" \
        --task-id "96f2ad59-97e3-461d-a63d-40c8aEXAMPLE" \
        --invocation-id "a5273e2c-d2c6-4880-b3e1-5e550EXAMPLE"

Output::

    {
        "Status": "SUCCESS",
        "Parameters": "{\"comment\":\"\",\"documentName\":\"AWS-RunPowerShellScript\",\"instanceIds\":[\"i-1234567890EXAMPLE\"],\"maxConcurrency\":\"1\",\"maxErrors\":\"1\",\"parameters\":{\"executionTimeout\":[\"3600\"],\"workingDirectory\":[\"\"],\"commands\":[\"echo Hello\"]},\"timeoutSeconds\":600}",
        "ExecutionId": "03b6baa0-5460-4e15-83f2-ea685EXAMPLE",
        "InvocationId": "a5273e2c-d2c6-4880-b3e1-5e550EXAMPLE",
        "StartTime": 1549998326.421,
        "TaskType": "RUN_COMMAND",
        "EndTime": 1550001931.784,
        "WindowExecutionId": "bc494bfa-e63b-49f6-8ad1-aa9f2EXAMPLE",
        "StatusDetails": "Failed",
        "TaskExecutionId": "96f2ad59-97e3-461d-a63d-40c8aEXAMPLE"
    }

For more information, see `View Information About Tasks and Task Executions (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-task-info.html>`__ in the *AWS Systems Manager User Guide*.
