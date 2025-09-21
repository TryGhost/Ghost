**To add a tag a license configuration**

The following ``tag-resource`` example adds the specified tag (key name and value) to the specified license configuration. ::

  aws license-manager tag-resource \
      --tags Key=project,Value=lima \
      --resource-arn arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-6eb6586f508a786a2ba4f56c1EXAMPLE

This command produces no output.