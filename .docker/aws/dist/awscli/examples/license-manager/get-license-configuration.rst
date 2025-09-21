**To get license configuration information**

The following ``get-license-configuration`` example displays details for the specified license configuration. ::

    aws license-manager get-license-configuration \
        --license-configuration-arn arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-38b658717b87478aaa7c00883EXAMPLE

Output::

    {
        "LicenseConfigurationId": "lic-38b658717b87478aaa7c00883EXAMPLE",
        "LicenseConfigurationArn": "arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-38b658717b87478aaa7c00883EXAMPLE",
        "Name": "my-license-configuration",
        "LicenseCountingType": "vCPU",
        "LicenseRules": [],
        "LicenseCountHardLimit": false,
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
                "AssociationCount": 2
            },
            {
                "ResourceType": "SYSTEMS_MANAGER_MANAGED_INSTANCE",
                "AssociationCount": 0
            }
        ]
    }
