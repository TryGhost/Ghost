**To create a packaging group**

The following ``create-packaging-group`` example lists all of the packaging groups that are configured in the current AWS account. ::

    aws mediapackage-vod create-packaging-group \
        --id hls_chicken

Output::

    {
        "Arn": "arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-groups/hls_chicken", 
        "Id": "hls_chicken" 
    }

For more information, see `Creating a Packaging Group  <https://docs.aws.amazon.com/mediapackage/latest/ug/pkg-group-create.html>`__ in the *AWS Elemental MediaPackage User Guide*.
