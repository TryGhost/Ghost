**To describe a packaging configuration**

The following ``describe-packaging-configuration`` example displays all of the details of the packaging configuration named ``DASH``. ::

    aws mediapackage-vod describe-packaging-configuration \
        --id DASH

Output::

    { 
        "Arn":"arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-configurations/DASH",
        "Id":"DASH",
        "PackagingGroupId":"Packaging_group_1",
        "DashPackage":[ 
            { 
                "SegmentDurationSeconds":"2"
            },
            { 
                "DashManifests":{ 
                    "ManifestName":"index",
                    "MinBufferTimeSeconds":"30",
                    "Profile":"NONE"
                }
            }
        ]
    }

For more information, see `Viewing Packaging Configuration Details <https://docs.aws.amazon.com/mediapackage/latest/ug/pkg-cfig-view.html>`__ in the *AWS Elemental MediaPackage User Guide*.
