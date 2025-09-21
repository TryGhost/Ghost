**To update the license configurations for a resource**

The following ``update-license-specifications-for-resource`` example replaces the license configuration associated with the specified Amazon Machine Image (AMI) by removing one license configuration and adding another. ::

    aws license-manager update-license-specifications-for-resource \
        --resource-arn arn:aws:ec2:us-west-2::image/ami-1234567890abcdef0 \
        --remove-license-specifications LicenseConfigurationArn=arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-38b658717b87478aaa7c00883EXAMPLE \
        --add-license-specifications LicenseConfigurationArn=arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-42b6deb06e5399a980d555927EXAMPLE 

This command produces no output.
