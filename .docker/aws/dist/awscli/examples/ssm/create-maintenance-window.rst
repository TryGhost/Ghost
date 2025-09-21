**Example 1: To create a maintenance window**

The following ``create-maintenance-window`` example creates a new maintenance window that every five minutes for up to two hours (as needed), prevents new tasks from starting within one hour of the end of the maintenance window execution, allows unassociated targets (instances that you haven't registered with the maintenance window), and indicates through the use of custom tags that its creator intends to use it in a tutorial. ::

    aws ssm create-maintenance-window \
        --name "My-Tutorial-Maintenance-Window" \
        --schedule "rate(5 minutes)" \
        --duration 2 --cutoff 1 \
        --allow-unassociated-targets \
        --tags "Key=Purpose,Value=Tutorial"

Output::

    {
        "WindowId": "mw-0c50858d01EXAMPLE"
    }


**Example 2: To create a maintenance window that runs only once**

The following ``create-maintenance-window`` example creates a new maintenance window that only runs one time on the specified date and time. ::

    aws ssm create-maintenance-window \
        --name My-One-Time-Maintenance-Window \
        --schedule "at(2020-05-14T15:55:00)" \
        --duration 5 \
        --cutoff 2 \
        --allow-unassociated-targets \
        --tags "Key=Environment,Value=Production"

Output::

    {
        "WindowId": "mw-01234567890abcdef"
    }

For more information, see `Maintenance Windows <https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-maintenance.html>`_ in the *AWS Systems Manager User Guide*.
