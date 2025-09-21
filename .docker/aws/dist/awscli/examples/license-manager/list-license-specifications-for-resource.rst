**To list the license configurations for a resource**

The following ``list-license-specifications-for-resource`` example lists the license configurations associated with the specified Amazon Machine Image (AMI). ::

    aws license-manager list-license-specifications-for-resource \
        --resource-arn arn:aws:ec2:us-west-2::image/ami-1234567890abcdef0

Output::

    {
        "LicenseConfigurationArn": "arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-38b658717b87478aaa7c00883EXAMPLE"
    }

