**To cancel a maintenance window execution**

This ``cancel-maintenance-window-execution`` example stops the specified maintenance window execution that is already in progress. ::

    aws ssm cancel-maintenance-window-execution \
        --window-execution-id j2l8d5b5c-mw66-tk4d-r3g9-1d4d1EXAMPLE

Output::

    {
        "WindowExecutionId": "j2l8d5b5c-mw66-tk4d-r3g9-1d4d1EXAMPLE"
    }  

For more information, see `Systems Manager Maintenance Windows Tutorials (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-tutorials.html>`__ in the *AWS Systems Manager User Guide*.
