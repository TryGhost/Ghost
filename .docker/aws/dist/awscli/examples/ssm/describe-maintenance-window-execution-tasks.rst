**To list all tasks associated with a maintenance window execution**

The following ``ssm describe-maintenance-window-execution-tasks`` example lists the tasks associated with the specified maintenance window execution. ::

    aws ssm describe-maintenance-window-execution-tasks \
        --window-execution-id "518d5565-5969-4cca-8f0e-da3b2EXAMPLE"

Output::

    {
        "WindowExecutionTaskIdentities": [
            {
                "Status": "SUCCESS",
                "TaskArn": "AWS-RunShellScript",
                "StartTime": 1487692834.684,
                "TaskType": "RUN_COMMAND",
                "EndTime": 1487692835.005,
                "WindowExecutionId": "518d5565-5969-4cca-8f0e-da3b2EXAMPLE",
                "TaskExecutionId": "ac0c6ae1-daa3-4a89-832e-d3845EXAMPLE"
            }
        ]
    }

For more information, see `View Information About Tasks and Task Executions (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-task-info.html>`__ in the *AWS Systems Manager User Guide*.
