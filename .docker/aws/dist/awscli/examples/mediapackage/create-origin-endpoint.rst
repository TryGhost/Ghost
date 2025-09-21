**To create an origin endpoint**

The following ``create-origin-endpoint`` command creates an origin endpoint named ``cmafsports`` with the package settings provided in a JSON file and specified endpoint settings. ::

    aws mediapackage create-origin-endpoint \
        --channel-id sportschannel \
        --id cmafsports \
        --cmaf-package file://file/path/cmafpkg.json --description "cmaf output of sports" \
        --id cmaf_sports \
        --manifest-name sports_channel \
        --startover-window-seconds 300 \
        --tags region=west,media=sports \
        --time-delay-seconds 10
        
Output::

    {
        "Arn": "arn:aws:mediapackage:us-west-2:111222333:origin_endpoints/1dc6718be36f4f34bb9cd86bc50925e6",
        "ChannelId": "sportschannel",
        "CmafPackage": {
            "HlsManifests": [
                {
                    "AdMarkers": "PASSTHROUGH",
                    "Id": "cmaf_sports_endpoint",
                    "IncludeIframeOnlyStream": true,
                    "ManifestName": "index",
                    "PlaylistType": "EVENT",
                    "PlaylistWindowSeconds": 300,
                    "ProgramDateTimeIntervalSeconds": 300,
                    "Url": "https://c4af3793bf76b33c.mediapackage.us-west-2.amazonaws.com/out/v1/1dc6718be36f4f34bb9cd86bc50925e6/cmaf_sports_endpoint/index.m3u8"
                }
            ],
            "SegmentDurationSeconds": 2,
            "SegmentPrefix": "sportschannel"
        },
        "Description": "cmaf output of sports",
        "Id": "cmaf_sports",
        "ManifestName": "sports_channel",
        "StartoverWindowSeconds": 300,
        "Tags": {
            "region": "west",
            "media": "sports"
        },
        "TimeDelaySeconds": 10,
        "Url": "",
        "Whitelist": []
    }

For more information, see `Creating an Endpoint <https://docs.aws.amazon.com/mediapackage/latest/ug/endpoints-create.html>`__ in the *AWS Elemental MediaPackage User Guide*.
