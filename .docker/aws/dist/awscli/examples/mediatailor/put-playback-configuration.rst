**To create a configuration**

The following ``put-playback-configuration`` creates a configuration named ``campaign_short``. ::

    aws mediatailor put-playback-configuration \
        --name campaign_short \
        --ad-decision-server-url http://your.ads.url \
        --video-content-source-url http://video.bucket/index.m3u8

Output::

    {
        "AdDecisionServerUrl": "http://your.ads.url",
        "CdnConfiguration": {},
        "DashConfiguration": {
             "ManifestEndpointPrefix": "https://13484114d38f4383bc0d6a7cb879bd00.mediatailor.us-west-2.amazonaws.com/v1/dash/1cbfeaaecb69778e0c167d0505a2bc57da2b1754/campaign_short/",
             "MpdLocation": "EMT_DEFAULT",
             "OriginManifestType": "MULTI_PERIOD"
        },
        "HlsConfiguration": {
            "ManifestEndpointPrefix": "https://13484114d38f4383bc0d6a7cb879bd00.mediatailor.us-west-2.amazonaws.com/v1/master/1cbfeaaecb69778e0c167d0505a2bc57da2b1754/campaign_short/"
        },
        "Name": "campaign_short",
        "PlaybackConfigurationArn": "arn:aws:mediatailor:us-west-2:123456789012:playbackConfiguration/campaign_short",
        "PlaybackEndpointPrefix": "https://13484114d38f4383bc0d6a7cb879bd00.mediatailor.us-west-2.amazonaws.com",
        "SessionInitializationEndpointPrefix": "https://13484114d38f4383bc0d6a7cb879bd00.mediatailor.us-west-2.amazonaws.com/v1/session/1cbfeaaecb69778e0c167d0505a2bc57da2b1754/campaign_short/",
        "Tags": {},
        "VideoContentSourceUrl": "http://video.bucket/index.m3u8"
    }

For more information, see `Creating a Configuration <https://docs.aws.amazon.com/mediatailor/latest/ug/configurations-create.html>`__ in the *AWS Elemental MediaTailor User Guide*.
