**Example 1: To list all targets for a Maintenance Window**

The following ``describe-maintenance-window-targets`` example lists all of the targets for a maintenance window. ::

    aws ssm describe-maintenance-window-targets \
        --window-id "mw-06cf17cbefEXAMPLE"

Output::

    {
        "Targets": [
            {
                "ResourceType": "INSTANCE",
                "OwnerInformation": "Single instance",
                "WindowId": "mw-06cf17cbefEXAMPLE",
                "Targets": [
                    {
                        "Values": [
                            "i-0000293ffdEXAMPLE"
                        ],
                        "Key": "InstanceIds"
                    }
                ],
                "WindowTargetId": "350d44e6-28cc-44e2-951f-4b2c9EXAMPLE"
            },
            {
                "ResourceType": "INSTANCE",
                "OwnerInformation": "Two instances in a list",
                "WindowId": "mw-06cf17cbefEXAMPLE",
                "Targets": [
                    {
                        "Values": [
                            "i-0000293ffdEXAMPLE",
                            "i-0cb2b964d3EXAMPLE"
                        ],
                        "Key": "InstanceIds"
                    }
                ],
                "WindowTargetId": "e078a987-2866-47be-bedd-d9cf4EXAMPLE"
            }
        ]
    }

**Example 2: To list all targets for a maintenance window matching a specific owner information value**

This ``describe-maintenance-window-targets`` example lists all of the targets for a maintenance window with a specific value. ::

    aws ssm describe-maintenance-window-targets \
        --window-id "mw-0ecb1226ddEXAMPLE" \
        --filters "Key=OwnerInformation,Values=CostCenter1"

Output::

    {
        "Targets": [
            {
                "WindowId": "mw-0ecb1226ddEXAMPLE",
                "WindowTargetId": "da89dcc3-7f9c-481d-ba2b-edcb7d0057f9",
                "ResourceType": "INSTANCE",
                "Targets": [
                    {
                        "Key": "tag:Environment",
                        "Values": [
                            "Prod"
                        ]
                    }
                ],
                "OwnerInformation": "CostCenter1",
                "Name": "ProdTarget1"
            }
        ]
    }

For more information, see `View Information About Maintenance Windows (AWS CLI) <https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows-cli-tutorials-describe.html>`__ in the *AWS Systems Manager User Guide*.
