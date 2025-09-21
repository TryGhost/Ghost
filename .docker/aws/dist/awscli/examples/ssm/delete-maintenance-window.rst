**To delete a maintenance window**

This ``delete-maintenance-window`` example removes the specified maintenance window. ::

    aws ssm delete-maintenance-window \
        --window-id "mw-1a2b3c4d5e6f7g8h9"

Output::

    {
        "WindowId":"mw-1a2b3c4d5e6f7g8h9"
    }
  
For more information, see `Delete a Maintenance Window (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/mw-cli-tutorial-delete-mw.html>`__ in the *AWS Systems Manager User Guide*.
