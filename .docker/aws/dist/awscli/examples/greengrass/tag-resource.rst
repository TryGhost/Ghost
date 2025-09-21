**To apply tags to a resource**

The following ``tag-resource`` example applies two tags, ``ResourceType`` and ``ResourceSubType``, to the specified Greengrass resource. This operation can both add new tags and values or update the value for existing tags.  Use the ``untag-resource`` command to remove a tag. ::

    aws greengrass tag-resource \
        --resource-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658" \
        --tags "ResourceType=Device,ResourceSubType=USB"
    
This command produces no output.

For more information, see `Tagging Your Greengrass Resources <https://docs.aws.amazon.com/greengrass/latest/developerguide/tagging.html>`__ in the **AWS IoT Greengrass Developer Guide**.
