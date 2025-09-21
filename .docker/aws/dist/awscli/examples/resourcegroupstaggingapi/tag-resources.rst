**To attach a tag to a resource**

The following ``tag-resources`` example tags the specified resource with a key name and value. ::

    aws resourcegroupstaggingapi tag-resources \
        --resource-arn-list arn:aws:s3:::MyProductionBucket \
        --tags Environment=Production,CostCenter=1234

Output::

    {
        "FailedResourcesMap": {}
    }

For more information, see `TagResources <https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_TagResources.html>`__ in the *Resource Groups Tagging API Reference*.
