**To list the tags attached to a resource**

The following ``list-tags-for-resource`` example lists the tags and their values that are attached to the specified resource. ::

    aws greengrass list-tags-for-resource \
        --resource-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658"
    
Output::

    {
        "tags": {
            "ResourceSubType": "USB",
            "ResourceType": "Device"
        }
    }

For more information, see `Tagging Your Greengrass Resources <https://docs.aws.amazon.com/greengrass/latest/developerguide/tagging.html>`__ in the **AWS IoT Greengrass Developer Guide**.
