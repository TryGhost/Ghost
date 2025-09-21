**To list the licenses in use for a license configuration**

The following ``list-usage-for-license-configuration`` example lists information about the resources using licenses for the specified license configuration. For example, if the license type is vCPU, any instances consume one license per vCPU. ::

  aws license-manager list-usage-for-license-configuration \
      --license-configuration-arn arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-38b658717b87478aaa7c00883EXAMPLE

Output::

    {
        "LicenseConfigurationUsageList": [
            {
                "ResourceArn": "arn:aws:ec2:us-west-2:123456789012:instance/i-04a636d18e83cfacb",
                "ResourceType": "EC2_INSTANCE",
                "ResourceStatus": "running",
                "ResourceOwnerId": "123456789012",
                "AssociationTime": 1570892850.519,
                "ConsumedLicenses": 2
            }
        ]
    }
