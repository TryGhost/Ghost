**To get the specific task invocations performed for a maintenance window task execution**

The following ``describe-maintenance-window-execution-task-invocations`` example lists the invocations for the specified task executed as part of the specified maintenance window execution. ::

    aws ssm describe-maintenance-window-execution-task-invocations \
        --window-execution-id "518d5565-5969-4cca-8f0e-da3b2a638355" \
        --task-id "ac0c6ae1-daa3-4a89-832e-d384503b6586"

Output::

    {
        "WindowExecutionTaskInvocationIdentities": [
            {
                "Status": "SUCCESS",
                "Parameters": "{\"documentName\":\"AWS-RunShellScript\",\"instanceIds\":[\"i-0000293ffd8c57862\"],\"parameters\":{\"commands\":[\"df\"]},\"maxConcurrency\":\"1\",\"maxErrors\":\"1\"}",
                "InvocationId": "e274b6e1-fe56-4e32-bd2a-8073c6381d8b",
                "StartTime": 1487692834.723,
                "EndTime": 1487692834.871,
                "WindowExecutionId": "518d5565-5969-4cca-8f0e-da3b2a638355",
                "TaskExecutionId": "ac0c6ae1-daa3-4a89-832e-d384503b6586"
            }
        ]
    }

For more information, see `View Information About Tasks and Task Executions (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-task-info.html>`__ in the *AWS Systems Manager User Guide*.
