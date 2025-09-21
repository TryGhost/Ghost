**To update a maintenance window target**

The following ``update-maintenance-window-target`` example updates only the name of a maintenance window target. ::

    aws ssm update-maintenance-window-target \
        --window-id "mw-0c5ed765acEXAMPLE" \
        --window-target-id "57e8344e-fe64-4023-8191-6bf05EXAMPLE" \
        --name "NewName" \
        --no-replace

Output::

    {
        "Description": "",
        "OwnerInformation": "",
        "WindowTargetId": "57e8344e-fe64-4023-8191-6bf05EXAMPLE",
        "WindowId": "mw-0c5ed765acEXAMPLE",
        "Targets": [
            {
                "Values": [
                    "i-1234567890EXAMPLE"
                ],
                "Key": "InstanceIds"
            }
        ],
        "Name": "NewName"
    }

For more information, see `Update a Maintenance Window (AWS CLI)  <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-update.html>`__ in the *AWS Systems Manager User Guide*.
