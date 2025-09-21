**To list the tags assigned to a resource**

The following ``list-tags-for-resource`` command lists the tags that are assigned to the specified resource. ::

    aws mediapackage list-tags-for-resource \
        --resource-arn arn:aws:mediapackage:us-west-2:111222333:channels/6d345804ec3f46c9b454a91d4a80d0e0

Output::

    {
        "Tags": {
            "region": "west"
        }
    }

For more information, see `Tagging Resources in AWS Elemental MediaPackage <https://docs.aws.amazon.com/mediapackage/latest/ug/tagging.html>`__ in the *AWS Elemental MediaPackage User Guide*.
