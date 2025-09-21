**To list all packaging configurations**

The following ``list-packaging-configurations`` example lists all of the packaging configurations that are configured on the packaging group named ``Packaging_group_1``. ::

    aws mediapackage-vod list-packaging-configurations \
        --packaging-group-id Packaging_group_1 

Output::

    { 
        "PackagingConfigurations":[ 
            { 
                "Arn":"arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-configurations/CMAF", 
                "Id":"CMAF", 
                "PackagingGroupId":"Packaging_group_1", 
                "CmafPackage":[ 
                    { 
                        "SegmentDurationSeconds":"2" 
                    }, 
                    { 
                        "HlsManifests":{  
                            "AdMarkers":"NONE", 
                            "RepeatExtXKey":"False", 
                            "ManifestName":"index", 
                            "ProgramDateTimeIntervalSeconds":"0", 
                            "IncludeIframeOnlyStream":"False" 
                        } 
                    } 
                ] 
            }, 
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
            }, 
            {  
                "Arn":"arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-configurations/HLS", 
                "Id":"HLS", 
                "PackagingGroupId":"Packaging_group_1", 
                "HlsPackage":[  
                    {  
                        "SegmentDurationSeconds":"6", 
                        "UseAudioRenditionGroup":"False" 
                    }, 
                    {  
                        "HlsManifests":{  
                            "AdMarkers":"NONE", 
                            "RepeatExtXKey":"False", 
                            "ManifestName":"index", 
                            "ProgramDateTimeIntervalSeconds":"0", 
                            "IncludeIframeOnlyStream":"False" 
                        } 
                    } 
                ] 
            }, 
            {  
                "Arn":"arn:aws:mediapackage-vod:us-west-2:111122223333:packaging-configurations/New_config_0_copy", 
                "Id":"New_config_0_copy", 
                "PackagingGroupId":"Packaging_group_1", 
                "HlsPackage":[  
                    {  
                        "SegmentDurationSeconds":"6", 
                        "UseAudioRenditionGroup":"False" 
                    }, 
                    {  
                        "Encryption":{ 
                            "EncryptionMethod":"AWS_128", 
                            "SpekeKeyProvider":{  
                               "RoleArn":"arn:aws:iam:111122223333::role/SPEKERole", 
                                "Url":"https://lfgubdvs97.execute-api.us-west-2.amazonaws.com/EkeStage/copyProtection/", 
                                "SystemIds":[  
                                    "81376844-f976-481e-a84e-cc25d39b0b33" 
                                ] 
                            } 
                        } 
                    }, 
                    {  
                        "HlsManifests":{  
                            "AdMarkers":"NONE", 
                            "RepeatExtXKey":"False", 
                            "ManifestName":"index", 
                            "ProgramDateTimeIntervalSeconds":"0", 
                            "IncludeIframeOnlyStream":"False" 
                        } 
                    } 
                ] 
            } 
        ] 
    }

For more information, see `Viewing Packaging Configuration Details <https://docs.aws.amazon.com/mediapackage/latest/ug/pkg-cfig-view.html>`__ in the *AWS Elemental MediaPackage User Guide*.
