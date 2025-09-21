**To add a tag to a resource**

The following ``tag-resource`` commands adds a ``region=west`` key and value pair to the specified resource. ::

    aws mediapackage tag-resource \
        --resource-arn arn:aws:mediapackage:us-west-2:111222333:channels/6d345804ec3f46c9b454a91d4a80d0e0 \
        --tags region=west

This command produces no output.

For more information, see `Tagging Resources in AWS Elemental MediaPackage <https://docs.aws.amazon.com/mediapackage/latest/ug/tagging.html>`__ in the *AWS Elemental MediaPackage User Guide*.
