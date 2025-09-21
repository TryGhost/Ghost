**To remove a tag from a resource**

The following ``untag-resource`` command removes the tag with the key ``region`` from the specified channel. ::

    aws mediapackage untag-resource \
        --resource-arn arn:aws:mediapackage:us-west-2:111222333:channels/6d345804ec3f46c9b454a91d4a80d0e0 \
        --tag-keys region

For more information, see `Tagging Resources in AWS Elemental MediaPackage <https://docs.aws.amazon.com/mediapackage/latest/ug/tagging.html>`__ in the *AWS Elemental MediaPackage User Guide*.
