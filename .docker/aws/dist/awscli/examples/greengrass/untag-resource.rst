**To remove a tag and its value from a resource**

The following ``untag-resource`` example removes the tag whose key is ``Category`` from the specified Greengrass group. If the key ``Category`` does not exist for the specified resource, no error is returned. ::

    aws greengrass untag-resource \
        --resource-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731" \
        --tag-keys "Category"
    
This command produces no output.

For more information, see `Tagging Your Greengrass Resources <https://docs.aws.amazon.com/greengrass/latest/developerguide/tagging.html>`__ in the **AWS IoT Greengrass Developer Guide**.
