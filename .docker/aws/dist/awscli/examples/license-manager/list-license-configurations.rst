**Example 1: To list all of your license configurations**

The following ``list-license-configurations`` example lists all your license configurations. ::

    aws license-manager list-license-configurations 

Output::

    {
        "LicenseConfigurations": [
            {
                "LicenseConfigurationId": "lic-6eb6586f508a786a2ba4f56c1EXAMPLE",
                "LicenseConfigurationArn": "arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-6eb6586f508a786a2ba4f56c1EXAMPLE",
                "Name": "my-license-configuration",
                "LicenseCountingType": "Core",
                "LicenseRules": [],
                "LicenseCount": 10,
                "LicenseCountHardLimit": true,
                "ConsumedLicenses": 0,
                "Status": "AVAILABLE",
                "OwnerAccountId": "123456789012",
                "ConsumedLicenseSummaryList": [
                    {
                        "ResourceType": "EC2_INSTANCE",
                        "ConsumedLicenses": 0
                    },
                    {
                        "ResourceType": "EC2_HOST",
                        "ConsumedLicenses": 0
                    },
                    {
                        "ResourceType": "SYSTEMS_MANAGER_MANAGED_INSTANCE",
                        "ConsumedLicenses": 0
                    }
                ],
                "ManagedResourceSummaryList": [
                    {
                        "ResourceType": "EC2_INSTANCE",
                        "AssociationCount": 0
                    },
                    {
                        "ResourceType": "EC2_HOST",
                        "AssociationCount": 0
                    },
                    {
                        "ResourceType": "EC2_AMI",
                        "AssociationCount": 0
                    },
                    {
                        "ResourceType": "SYSTEMS_MANAGER_MANAGED_INSTANCE",
                        "AssociationCount": 0
                    }
                ]
            },
            {
                ...
            }
        ]
    }

**Example 2: To list a specific license configuration**

The following ``list-license-configurations`` example lists only the specified license configuration. ::

    aws license-manager list-license-configurations \
        --license-configuration-arns arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-38b658717b87478aaa7c00883EXAMPLE
