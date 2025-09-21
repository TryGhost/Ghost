**To describe an asset**

The following ``describe-asset`` example displays all of the details of the asset named ``30sec_chicken``. ::

    aws mediapackage-vod describe-asset \
        --id 30sec_chicken

Output::

    { 
        "Arn":"arn:aws:mediapackage-vod:us-west-2:111122223333:assets/30sec_chicken",
        "Id":"30sec_chicken",
        "PackagingGroupId":"Packaging_group_1",
        "SourceArn":"arn:aws:s3::111122223333:video-bucket/A/30sec_chicken.smil",
        "SourceRoleArn":"arn:aws:iam::111122223333:role/EMP_Vod",
        "EgressEndpoints":[ 
            { 
                "PackagingConfigurationId":"DASH",
                "Url":"https://a5f46a44118ba3e3724ef39ef532e701.egress.mediapackage-vod.us-west-2.amazonaws.com/out/v1/aad7962c569946119c2d5a691be5663c/66c25aff456d463aae0855172b3beb27/4ddfda6da17c4c279a1b8401cba31892/index.mpd"
            },
            { 
                "PackagingConfigurationId":"HLS",
                "Url":"https://a5f46a44118ba3e3724ef39ef532e701.egress.mediapackage-vod.us-west-2.amazonaws.com/out/v1/aad7962c569946119c2d5a691be5663c/6e5bf286a3414254a2bf0d22ae148d7e/06b5875b4d004c3cbdc4da2dc4d14638/index.m3u8"
            },
            { 
                "PackagingConfigurationId":"CMAF",
                "Url":"https://a5f46a44118ba3e3724ef39ef532e701.egress.mediapackage-vod.us-west-2.amazonaws.com/out/v1/aad7962c569946119c2d5a691be5663c/628fb5d8d89e4702958b020af27fde0e/05eb062214064238ad6330a443aff7f7/index.m3u8"
            }
        ]
    }

For more information, see `Viewing Asset Details <https://docs.aws.amazon.com/mediapackage/latest/ug/asset-view.html>`__ in the *AWS Elemental MediaPackage User Guide*.
