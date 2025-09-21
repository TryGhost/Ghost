**To describe an origin endpoint**

The following ``describe-origin-endpoint`` command displays all of the details of the origin endpoint named ``cmaf_sports``. ::

    aws mediapackage describe-origin-endpoint \
        --id cmaf_sports

Output::

    {
        "Arn": "arn:aws:mediapackage:us-west-2:111222333:origin_endpoints/1dc6718be36f4f34bb9cd86bc50925e6",
        "ChannelId": "sportschannel",
        "CmafPackage": {
            "HlsManifests": [
                {
                    "AdMarkers": "NONE",
                    "Id": "cmaf_sports_endpoint",
                    "IncludeIframeOnlyStream": false,
                    "PlaylistType": "EVENT",
                    "PlaylistWindowSeconds": 60,
                    "ProgramDateTimeIntervalSeconds": 0,
                    "Url": "https://c4af3793bf76b33c.mediapackage.us-west-2.amazonaws.com/out/v1/1dc6718be36f4f34bb9cd86bc50925e6/cmaf_sports_endpoint/index.m3u8"
                }
            ],
            "SegmentDurationSeconds": 2,
            "SegmentPrefix": "sportschannel"
        },
        "Id": "cmaf_sports",
        "ManifestName": "index",
        "StartoverWindowSeconds": 0,
        "Tags": {
            "region": "west",
            "media": "sports"
        },
        "TimeDelaySeconds": 0,
        "Url": "",
        "Whitelist": []
    }

For more information, see `Viewing a Single Endpoint <https://docs.aws.amazon.com/mediapackage/latest/ug/endpoints-view-one.html>`__ in the *AWS Elemental MediaPackage User Guide*.
