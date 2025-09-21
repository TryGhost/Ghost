**To create an asset**

The following ``create-asset`` example creates an asset named ``Chicken_Asset`` in the current AWS account. The asset ingests the file ``30sec_chicken.smil`` to MediaPackage. ::

    aws mediapackage-vod create-asset \
        --id chicken_asset \
        --packaging-group-id hls_chicken_gp \
        --source-role-arn arn:aws:iam::111122223333:role/EMP_Vod \
        --source-arn arn:aws:s3::111122223333:video-bucket/A/30sec_chicken.smil 

Output::

    { 
        "Arn":"arn:aws:mediapackage-vod:us-west-2:111122223333:assets/chicken_asset", 
        "Id":"chicken_asset",
        "PackagingGroupId":"hls_chicken_gp", 
        "SourceArn":"arn:aws:s3::111122223333:video-bucket/A/30sec_chicken.smil", 
        "SourceRoleArn":"arn:aws:iam::111122223333:role/EMP_Vod", 
        "EgressEndpoints":[  
            {  
                "PackagingConfigurationId":"New_config_1", 
                "Url":"https://c75ea2668ab49d02bca7ae10ef31c59e.egress.mediapackage-vod.us-west-2.amazonaws.com/out/v1/6644b55df1744261ab3732a8e5cdaf07/904b06a58c7645e08d57d40d064216ac/f5b2e633ff4942228095d164c10074f3/index.m3u8" 
            },
            {  
                "PackagingConfigurationId":"new_hls", 
                "Url":" https://c75ea2668ab49d02bca7ae10ef31c59e.egress.mediapackage-vod.us-west-2.amazonaws.com/out/v1/6644b55df1744261ab3732a8e5cdaf07/fe8f1f00a80e424cb4f8da4095835e9e/7370ec57432343af816332356d2bd5c6/string.m3u8" 
            } 
        ] 
    } 

For more information, see `Ingest an Asset <https://docs.aws.amazon.com/mediapackage/latest/ug/asset-create.html>`__ in the *AWS Elemental MediaPackage User Guide*.
