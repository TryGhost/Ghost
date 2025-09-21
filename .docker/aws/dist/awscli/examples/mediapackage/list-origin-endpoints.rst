**To list all origin-endpoints on a channel**

The following ``list-origin-endpoints`` command lists all of the origin endpoints that are configured on the channel named ``test``. ::

    aws mediapackage list-origin-endpoints \
        --channel-id test

Output::

    {
        "OriginEndpoints": [
            {
                "Arn": "arn:aws:mediapackage:us-west-2:111222333:origin_endpoints/247cff871f2845d3805129be22f2c0a2",
                "ChannelId": "test",
                "DashPackage": {
                    "ManifestLayout": "FULL",
                    "ManifestWindowSeconds": 60,
                    "MinBufferTimeSeconds": 30,
                    "MinUpdatePeriodSeconds": 15,
                    "PeriodTriggers": [],
                    "Profile": "NONE",
                    "SegmentDurationSeconds": 2,
                    "SegmentTemplateFormat": "NUMBER_WITH_TIMELINE",
                    "StreamSelection": {
                        "MaxVideoBitsPerSecond": 2147483647,
                        "MinVideoBitsPerSecond": 0,
                        "StreamOrder": "ORIGINAL"
                    },
                    "SuggestedPresentationDelaySeconds": 25
                },
                "Id": "tester2",
                "ManifestName": "index",
                "StartoverWindowSeconds": 0,
                "Tags": {},
                "TimeDelaySeconds": 0,
                "Url": "https://8343f7014c0ea438.mediapackage.us-west-2.amazonaws.com/out/v1/247cff871f2845d3805129be22f2c0a2/index.mpd",
                "Whitelist": []
            },
            {
                "Arn": "arn:aws:mediapackage:us-west-2:111222333:origin_endpoints/869e237f851549e9bcf10e3bc2830839",
                "ChannelId": "test",
                "HlsPackage": {
                    "AdMarkers": "NONE",
                    "IncludeIframeOnlyStream": false,
                    "PlaylistType": "EVENT",
                    "PlaylistWindowSeconds": 60,
                    "ProgramDateTimeIntervalSeconds": 0,
                    "SegmentDurationSeconds": 6,
                    "StreamSelection": {
                        "MaxVideoBitsPerSecond": 2147483647,
                        "MinVideoBitsPerSecond": 0,
                        "StreamOrder": "ORIGINAL"
                    },
                    "UseAudioRenditionGroup": false
                },
                "Id": "tester",
                "ManifestName": "index",
                "StartoverWindowSeconds": 0,
                "Tags": {},
                "TimeDelaySeconds": 0,
                "Url": "https://8343f7014c0ea438.mediapackage.us-west-2.amazonaws.com/out/v1/869e237f851549e9bcf10e3bc2830839/index.m3u8",
                "Whitelist": []
            }
        ]
    }

For more information, see `Viewing all Endpoints Associated with a Channel <https://docs.aws.amazon.com/mediapackage/latest/ug/endpoints-view-all.html>`__ in the *AWS Elemental MediaPackage User Guide*.
