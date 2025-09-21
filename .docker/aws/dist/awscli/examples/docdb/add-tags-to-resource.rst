**To add one or more tags to a specified resource**

The following ``add-tags-to-resource`` example adds three tags to ``sample-cluster``. One tag (``CropB``) has a key name but no value. ::

    aws docdb add-tags-to-resource \
        --resource-name arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster \
        --tags Key="CropA",Value="Apple" Key="CropB" Key="CropC",Value="Corn"

This command produces no output.

For more information, see `Tagging Amazon DocumentDB Resources <https://docs.aws.amazon.com/documentdb/latest/developerguide/tagging.html>`__ in the *Amazon DocumentDB Developer Guide*.
