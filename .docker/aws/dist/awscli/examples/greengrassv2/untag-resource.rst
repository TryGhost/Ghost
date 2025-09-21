**To remove a tag from a resource**

The following ``untag-resource`` example removes an owner tag from an AWS IoT Greengrass core device. ::

    aws iotsitewise untag-resource \
        --resource-arn arn:aws:greengrass:us-west-2:123456789012:coreDevices:MyGreengrassCore \
        --tag-keys Owner

This command produces no output.

For more information, see `Tag your resources <https://docs.aws.amazon.com/greengrass/v2/developerguide/tag-resources.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.