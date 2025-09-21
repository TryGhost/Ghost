**To list all packaging groups**

The following ``list-packaging-groups`` example lists all of the packaging groups that are configured in the current AWS account. ::

    aws mediapackage-vod list-packaging-groups

Output::

    { 
        "PackagingGroups": [ 
            { 
                "Arn": "arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-groups/Dash_widevine", 
                "Id": "Dash_widevine" 
            }, 
            { 
                "Arn": "arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-groups/Encrypted_HLS", 
                "Id": "Encrypted_HLS"  
            }, 
            { 
                "Arn": "arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-groups/Packaging_group_1", 
                "Id": "Packaging_group_1" 
            } 
        ] 
    } 

For more information, see `Viewing Packaging Group Details <https://docs.aws.amazon.com/mediapackage/latest/ug/pkg-group-view.html>`__ in the *AWS Elemental MediaPackage User Guide*.
