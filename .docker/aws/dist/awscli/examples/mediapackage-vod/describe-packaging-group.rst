**To describe a packaging group**

The following ``describe-packaging-group`` example displays all of the details of the packaging group named ``Packaging_group_1``. ::

    aws mediapackage-vod describe-packaging-group \
        --id Packaging_group_1

Output::

    { 
        "Arn": "arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-groups/Packaging_group_1", 
        "Id": "Packaging_group_1" 
    }

For more information, see `Viewing Packaging Group Details <https://docs.aws.amazon.com/mediapackage/latest/ug/pkg-group-view.html>`__ in the *AWS Elemental MediaPackage User Guide*.
