**To remove a task from a maintenance window**

The following ``deregister-task-from-maintenance-window`` example removes the specified task from the specified maintenance window. ::

    aws ssm deregister-task-from-maintenance-window \
        --window-id "mw-ab12cd34ef56gh78" \
        --window-task-id "1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d5e6c"

Output::

    {
        "WindowTaskId":"1a2b3c4d-1a2b-1a2b-1a2b-1a2b3c4d5e6c",
        "WindowId":"mw-ab12cd34ef56gh78"
    }

For more information, see `Systems Manager Maintenance Windows Tutorials (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-tutorials.html>`__ in the *AWS Systems Manager User Guide*.
