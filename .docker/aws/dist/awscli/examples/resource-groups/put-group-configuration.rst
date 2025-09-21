**To attach a service configuration to a resource group**

Example 1: The following ``put-group-configuration`` example specifies that the resource group is to contain only Amazon EC2 capacity reservations for instances in the ``C5`` or ``M5`` families. ::

    aws resource-groups put-group-configuration \
        --group MyTestGroup \
        --configuration file://config.json

Contents of ``config.json``::

    [
        {
            "Type": "AWS::EC2::HostManagement",
            "Parameters": [
                {
                    "Name": "allowed-host-families",
                    "Values": [ "c5", "m5" ]
                },
                    {
                        "Name": "any-host-based-license-configuration",
                        "Values": [ "true" ]
                    }
            ]
        },
        {
            "Type": "AWS::ResourceGroups::Generic",
            "Parameters": [
                {
                    "Name": "allowed-resource-types",
                    "Values": [ "AWS::EC2::Host" ]
                },
                {
                    "Name": "deletion-protection",
                    "Values": [ "UNLESS_EMPTY" ]
                }
            ]
        }
    ]

This command produces no output if successful.

For more information, see `Service configurations for resource groups <https://docs.aws.amazon.com/ARG/latest/APIReference/about-slg.html>`__ in the *Resource Groups API Reference Guide*.
