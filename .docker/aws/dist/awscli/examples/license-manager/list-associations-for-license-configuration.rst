**To get associations for a license configuration**

The following ``list-associations-for-license-configuration`` example displays detailed information for the associations of the specified license configuration. ::

    aws license-manager list-associations-for-license-configuration \
        --license-configuration-arn arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-38b658717b87478aaa7c00883EXAMPLE

Output::

    {
        "LicenseConfigurationAssociations": [
            {
                "ResourceArn": "arn:aws:ec2:us-west-2::image/ami-1234567890abcdef0",
                "ResourceType": "EC2_AMI",
                "ResourceOwnerId": "123456789012",
                "AssociationTime": 1568825118.617
            },
            {
                "ResourceArn": "arn:aws:ec2:us-west-2::image/ami-0abcdef1234567890",
                "ResourceType": "EC2_AMI",
                "ResourceOwnerId": "123456789012",
                "AssociationTime": 1568825118.946
            }
        ]
    }
