**Example 1: To update a maintenance window**

The following ``update-maintenance-window`` example updates the name of a maintenance window. ::

    aws ssm update-maintenance-window \
        --window-id "mw-1a2b3c4d5e6f7g8h9" \
        --name "My-Renamed-MW"

Output::

    {
        "Cutoff": 1,
        "Name": "My-Renamed-MW",
        "Schedule": "cron(0 16 ? * TUE *)",
        "Enabled": true,
        "AllowUnassociatedTargets": true,
        "WindowId": "mw-1a2b3c4d5e6f7g8h9",
        "Duration": 4
    }
  
**Example 2: To disable a maintenance window**
  
The following ``update-maintenance-window`` example disables a maintenance window. ::

    aws ssm update-maintenance-window \
        --window-id "mw-1a2b3c4d5e6f7g8h9" \
        --no-enabled
        
**Example 3: To enable a maintenance window**

The following ``update-maintenance-window`` example enables a maintenance window. ::

    aws ssm update-maintenance-window \
        --window-id "mw-1a2b3c4d5e6f7g8h9" \
        --enabled

For more information, see `Update a Maintenance Window (AWS CLI)  <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-update.html>`__ in the *AWS Systems Manager User Guide*.
