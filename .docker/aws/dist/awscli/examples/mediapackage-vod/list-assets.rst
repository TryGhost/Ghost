**To list all assets**

The following ``list-assets`` example lists all of the assets that are configured in the current AWS account. ::

    aws mediapackage-vod list-assets 

Output::

    { 
        "Assets": [ 
            "Arn": "arn:aws:mediapackage-vod:us-west-2:111122223333:assets/30sec_chicken", 
            "Id": "30sec_chicken", 
            "PackagingGroupId": "Packaging_group_1", 
            "SourceArn": "arn:aws:s3::111122223333:video-bucket/A/30sec_chicken.smil", 
            "SourceRoleArn": "arn:aws:iam::111122223333:role/EMP_Vod" 
        ]
    }

For more information, see `Viewing Asset Details <https://docs.aws.amazon.com/mediapackage/latest/ug/asset-view.html>`__ in the *AWS Elemental MediaPackage User Guide*.
