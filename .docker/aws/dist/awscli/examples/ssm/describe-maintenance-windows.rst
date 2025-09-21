**Example 1: To list all maintenance windows**

The following ``describe-maintenance-windows`` example lists all maintenance windows in your AWS account in the current Region. ::

    aws ssm describe-maintenance-windows

Output::

    {
        "WindowIdentities": [
            {
                "WindowId": "mw-0ecb1226ddEXAMPLE",
                "Name": "MyMaintenanceWindow-1",
                "Enabled": true,
                "Duration": 2,
                "Cutoff": 1,
                "Schedule": "rate(180 minutes)",
                "NextExecutionTime": "2020-02-12T23:19:20.596Z"
            },
            {
                "WindowId": "mw-03eb9db428EXAMPLE",
                "Name": "MyMaintenanceWindow-2",
                "Enabled": true,
                "Duration": 3,
                "Cutoff": 1,
                "Schedule": "rate(7 days)",
                "NextExecutionTime": "2020-02-17T23:22:00.956Z"
            },
        ]
    }

**Example 2: To list all enabled maintenance windows**
  
The following ``describe-maintenance-windows`` example lists all enabled maintenance windows. ::

    aws ssm describe-maintenance-windows \
        --filters "Key=Enabled,Values=true"

**Example 3: To list maintenance windows matching a specific name**
  
This ``describe-maintenance-windows`` example lists all maintenance windows with the specified name. ::

    aws ssm describe-maintenance-windows \
        --filters "Key=Name,Values=MyMaintenanceWindow"

For more information, see `View Information About Maintenance Windows (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-describe.html>`__ in the *AWS Systems Manager User Guide*.
