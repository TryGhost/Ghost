**Example 1: To list upcoming executions for a maintenance window**

The following ``describe-maintenance-window-schedule`` example lists all upcoming executions for the specified maintenance window. ::

    aws ssm describe-maintenance-window-schedule \
        --window-id mw-ab12cd34eEXAMPLE

Output::

    {
        "ScheduledWindowExecutions": [
            {
                "WindowId": "mw-ab12cd34eEXAMPLE",
                "Name": "My-First-Maintenance-Window",
                "ExecutionTime": "2020-02-19T16:00Z"
            },
            {
                "WindowId": "mw-ab12cd34eEXAMPLE",
                "Name": "My-First-Maintenance-Window",
                "ExecutionTime": "2020-02-26T16:00Z"
            },
            ...
        ]
    }

**Example 2: To list all upcoming executions for a maintenance window before a specified date**

The following ``describe-maintenance-window-schedule`` example lists all upcoming executions for the specified maintenance window that occur before the specified date. ::

    aws ssm describe-maintenance-window-schedule \
        --window-id mw-0ecb1226dd7b2e9a6 \
        --filters "Key=ScheduledBefore,Values=2020-02-15T06:00:00Z"
  
**Example 3: To list all upcoming executions for a maintenance window after a specified date**

The following ``describe-maintenance-window-schedule`` example lists all upcoming executions for the specified maintenance window that occur after the specified date. ::

    aws ssm describe-maintenance-window-schedule \
        --window-id mw-0ecb1226dd7b2e9a6 \
        --filters "Key=ScheduledAfter,Values=2020-02-15T06:00:00Z" 
        
For more information, see `View Information About Maintenance Windows (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-describe.html>`__ in the *AWS Systems Manager User Guide*.
