**To remove tags from a license configuration**

The following ``untag-resource`` example removes the specified tag (key name and resource) from the specified license configuration. ::

  aws license-manager untag-resource \
      --tag-keys project \
      --resource-arn arn:aws:license-manager:us-west-2:123456789012:license-configuration:lic-6eb6586f508a786a2ba4f56c1EXAMPLE

This command produces no output.