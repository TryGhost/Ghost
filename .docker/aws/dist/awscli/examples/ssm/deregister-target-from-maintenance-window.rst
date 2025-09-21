**To remove a target from a maintenance window**

The following ``deregister-target-from-maintenance-window`` example removes the specified target from the specified maintenance window. ::

    aws ssm deregister-target-from-maintenance-window \
        --window-id "mw-ab12cd34ef56gh78" \
        --window-target-id "1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d-1a2"

Output::

    {
        "WindowId":"mw-ab12cd34ef56gh78",
        "WindowTargetId":"1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d-1a2"
    }

For more information, see `Update a Maintenance Window (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-update.html>`__ in the *AWS Systems Manager User Guide*.
