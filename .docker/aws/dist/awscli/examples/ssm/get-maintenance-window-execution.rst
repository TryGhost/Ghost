**To get information about a maintenance window task execution**

The following ``get-maintenance-window-execution`` example lists information about a task executed as part of the specified maintenance window execution. ::

    aws ssm get-maintenance-window-execution \
        --window-execution-id "518d5565-5969-4cca-8f0e-da3b2EXAMPLE"

Output::

    {
        "Status": "SUCCESS",
        "TaskIds": [
            "ac0c6ae1-daa3-4a89-832e-d3845EXAMPLE"
        ],
        "StartTime": 1487692834.595,
        "EndTime": 1487692835.051,
        "WindowExecutionId": "518d5565-5969-4cca-8f0e-da3b2EXAMPLE",
    }

For more information, see `View Information About Tasks and Task Executions (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-task-info.html>`__ in the *AWS Systems Manager User Guide*.
