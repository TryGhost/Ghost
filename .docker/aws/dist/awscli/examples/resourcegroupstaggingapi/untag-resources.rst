**To remove a tag from a resource**

The following ``untag-resources`` example removes the specified tag keys and any associated values from the specified resource. ::

    aws resourcegroupstaggingapi untag-resources \
        --resource-arn-list arn:aws:s3:::amzn-s3-demo-bucket \
        --tag-keys Environment CostCenter

Output::

    {
        "FailedResourcesMap": {}
    }

For more information, see `UntagResources <https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_UntagResources.html>`__ in the *Resource Groups Tagging API Reference*.
