**To describe a configuration**

The following ``get-playback-configuration`` displays all of the details of the configuration named ``west_campaign``. ::

    aws mediatailor get-playback-configuration \
        --name west_campaign

Output::

    {
         "AdDecisionServerUrl": "http://your.ads.url",
         "CdnConfiguration": {},
         "DashConfiguration": {
             "ManifestEndpointPrefix": "https://170c14299689462897d0cc45fc2000bb.mediatailor.us-west-2.amazonaws.com/v1/dash/1cbfeaaecb69778e0c167d0505a2bc57da2b1754/west_campaign/",
             "MpdLocation": "EMT_DEFAULT",
             "OriginManifestType": "MULTI_PERIOD"
         },
         "HlsConfiguration": {
             "ManifestEndpointPrefix": "https://170c14299689462897d0cc45fc2000bb.mediatailor.us-west-2.amazonaws.com/v1/master/1cbfeaaecb69778e0c167d0505a2bc57da2b1754/west_campaign/"
         },
         "Name": "west_campaign",
         "PlaybackConfigurationArn": "arn:aws:mediatailor:us-west-2:123456789012:playbackConfiguration/west_campaign",
         "PlaybackEndpointPrefix": "https://170c14299689462897d0cc45fc2000bb.mediatailor.us-west-2.amazonaws.com",
         "SessionInitializationEndpointPrefix": "https://170c14299689462897d0cc45fc2000bb.mediatailor.us-west-2.amazonaws.com/v1/session/1cbfeaaecb69778e0c167d0505a2bc57da2b1754/west_campaign/",
         "Tags": {},
         "VideoContentSourceUrl": "https://8343f7014c0ea438.mediapackage.us-west-2.amazonaws.com/out/v1/683f0f2ff7cd43a48902e6dcd5e16dcf/index.m3u8"
    }

For more information, see `Viewing a Configuration <https://docs.aws.amazon.com/mediatailor/latest/ug/configurations-view.html>`__ in the *AWS Elemental MediaTailor User Guide*.
