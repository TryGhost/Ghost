**To get information about a maintenance window**

The following ``get-maintenance-window`` example retrieves details about the specified maintenance window. ::

    aws ssm get-maintenance-window \
        --window-id "mw-03eb9db428EXAMPLE"

Output::

    {
        "AllowUnassociatedTargets": true,
        "CreatedDate": 1515006912.957,
        "Cutoff": 1,
        "Duration": 6,
        "Enabled": true,
        "ModifiedDate": 2020-01-01T10:04:04.099Z,
        "Name": "My-Maintenance-Window",
        "Schedule": "rate(3 days)",
        "WindowId": "mw-03eb9db428EXAMPLE",
        "NextExecutionTime": "2020-02-25T00:08:15.099Z"
    }

For more information, see `View information about maintenance windows (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-describe.html>`__ in the *AWS Systems Manager User Guide*.