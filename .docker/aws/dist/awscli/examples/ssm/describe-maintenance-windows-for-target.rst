**To list all maintenance windows associated with a specific instance**

The following ``describe-maintenance-windows-for-target`` example lists the maintenance windows that have targets or tasks associated with the specified instance. ::

    aws ssm describe-maintenance-windows-for-target \
        --targets Key=InstanceIds,Values=i-1234567890EXAMPLE \
        --resource-type INSTANCE

Output::

    {
        "WindowIdentities": [
            {
                "WindowId": "mw-0c5ed765acEXAMPLE",
                "Name": "My-First-Maintenance-Window"
            }
        ]
    }

For more information, see `View Information About Maintenance Windows (AWS CLI)  <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-describe.html>`__ in the *AWS Systems Manager User Guide*.
