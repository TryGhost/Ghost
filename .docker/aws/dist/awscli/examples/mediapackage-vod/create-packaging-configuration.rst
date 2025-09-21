**To create a packaging configuration**

The following ``create-packaging-configuration`` example creates a packaging configuration named ``new_hls`` in the packaging group named ``hls_chicken``. This example uses a file on disk named ``hls_pc.json`` to provide the details. ::

    aws mediapackage-vod create-packaging-configuration \
        --id new_hls \
        --packaging-group-id hls_chicken \
        --hls-package file://hls_pc.json

Contents of ``hls_pc.json``::

    { 
        "HlsManifests":[ 
            { 
                "AdMarkers":"NONE",
                "IncludeIframeOnlyStream":false,
                "ManifestName":"string",
                "ProgramDateTimeIntervalSeconds":60,
                "RepeatExtXKey":true,
                "StreamSelection":{ 
                    "MaxVideoBitsPerSecond":1000,
                    "MinVideoBitsPerSecond":0,
                    "StreamOrder":"ORIGINAL"
                }
            }
        ],
        "SegmentDurationSeconds":6,
        "UseAudioRenditionGroup":false
    }

Output::

    { 
        "Arn":"arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-configurations/new_hls",
        "Id":"new_hls",
        "PackagingGroupId":"hls_chicken",
        "HlsManifests":{ 
            "SegmentDurationSeconds":6,
            "UseAudioRenditionGroup":false,
            "HlsMarkers":[ 
                { 
                    "AdMarkers":"NONE",
                    "IncludeIframeOnlyStream":false,
                    "ManifestName":"string",
                    "ProgramDateTimeIntervalSeconds":60,
                    "RepeatExtXKey":true,
                    "StreamSelection":{ 
                        "MaxVideoBitsPerSecond":1000,
                        "MinVideoBitsPerSecond":0,
                        "StreamOrder":"ORIGINAL"
                    }
                }
            ]
        }
    }

For more information, see `Creating a Packaging Configuration <https://docs.aws.amazon.com/mediapackage/latest/ug/pkg-cfig-create.html>`__ in the *AWS Elemental MediaPackage User Guide*.
