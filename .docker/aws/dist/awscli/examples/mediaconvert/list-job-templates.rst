**Example 1: To list your custom job templates**

The following ``list-job-templates`` example lists all custom job templates in the current Region. To list the system job templates, see the next example. ::

    aws mediaconvert list-job-templates \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

Output::

    {
        "JobTemplates": [
            {
                "Description": "Create a DASH streaming ABR stack",
                "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:jobTemplates/DASH Streaming",
                "Name": "DASH Streaming",
                "LastUpdated": 1568653007,
                "Priority": 0,
                "Settings": {
                    ...<truncatedforbrevity>...
                },
                "Type": "CUSTOM",
                "StatusUpdateInterval": "SECONDS_60",
                "CreatedAt": 1568653007
            },
            {
                "Description": "Create a high-res file",
                "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:jobTemplates/File",
                "Name": "File",
                "LastUpdated": 1568653007,
                "Priority": 0,
                "Settings": {
                    ...<truncatedforbrevity>...
                },
                "Type": "CUSTOM",
                "StatusUpdateInterval": "SECONDS_60",
                "CreatedAt": 1568653023
            }
        ]
    }

**Example 2: To list the MediaConvert system job templates**

The following ``list-job-templates`` example lists all system job templates. ::

    aws mediaconvert list-job-templates \
        --endpoint-url https://abcd1234.mediaconvert.us-east-1.amazonaws.com \
        --list-by SYSTEM

Output::

    {
        "JobTemplates": [
            {
                "CreatedAt": 1568321779,
                "Arn": "arn:aws:mediaconvert:us-east-1:123456789012:jobTemplates/System-Generic_Mp4_Hev1_Avc_Aac_Sdr_Qvbr",
                "Name": "System-Generic_Mp4_Hev1_Avc_Aac_Sdr_Qvbr",
                "Description": "GENERIC, MP4, AVC + HEV1(HEVC,SDR), AAC, SDR, QVBR",
                "Category": "GENERIC",
                "Settings": {
                    "AdAvailOffset": 0,
                    "OutputGroups": [
                        {
                            "Outputs": [
                                {
                                    "Extension": "mp4",
                                    "Preset": "System-Generic_Hd_Mp4_Avc_Aac_16x9_Sdr_1280x720p_30Hz_5Mbps_Qvbr_Vq9",
                                    "NameModifier": "_Generic_Hd_Mp4_Avc_Aac_16x9_Sdr_1280x720p_30Hz_5000Kbps_Qvbr_Vq9"
                                },
                                {
                                    "Extension": "mp4",
                                    "Preset": "System-Generic_Hd_Mp4_Avc_Aac_16x9_Sdr_1920x1080p_30Hz_10Mbps_Qvbr_Vq9",
                                    "NameModifier": "_Generic_Hd_Mp4_Avc_Aac_16x9_Sdr_1920x1080p_30Hz_10000Kbps_Qvbr_Vq9"
                                },
                                {
                                    "Extension": "mp4",
                                    "Preset": "System-Generic_Sd_Mp4_Avc_Aac_16x9_Sdr_640x360p_30Hz_0.8Mbps_Qvbr_Vq7",
                                    "NameModifier": "_Generic_Sd_Mp4_Avc_Aac_16x9_Sdr_640x360p_30Hz_800Kbps_Qvbr_Vq7"
                                },
                                {
                                    "Extension": "mp4",
                                    "Preset": "System-Generic_Hd_Mp4_Hev1_Aac_16x9_Sdr_1280x720p_30Hz_4Mbps_Qvbr_Vq9",
                                    "NameModifier": "_Generic_Hd_Mp4_Hev1_Aac_16x9_Sdr_1280x720p_30Hz_4000Kbps_Qvbr_Vq9"
                                },
                                {
                                    "Extension": "mp4",
                                    "Preset": "System-Generic_Hd_Mp4_Hev1_Aac_16x9_Sdr_1920x1080p_30Hz_8Mbps_Qvbr_Vq9",
                                    "NameModifier": "_Generic_Hd_Mp4_Hev1_Aac_16x9_Sdr_1920x1080p_30Hz_8000Kbps_Qvbr_Vq9"
                                },
                                {
                                    "Extension": "mp4",
                                    "Preset": "System-Generic_Uhd_Mp4_Hev1_Aac_16x9_Sdr_3840x2160p_30Hz_12Mbps_Qvbr_Vq9",
                                    "NameModifier": "_Generic_Uhd_Mp4_Hev1_Aac_16x9_Sdr_3840x2160p_30Hz_12000Kbps_Qvbr_Vq9"
                                }
                            ],
                            "OutputGroupSettings": {
                                "FileGroupSettings": {
                                    
                                },
                                "Type": "FILE_GROUP_SETTINGS"
                            },
                            "Name": "File Group"
                        }
                    ]
                },
                "Type": "SYSTEM",
                "LastUpdated": 1568321779
            },
            ...<truncatedforbrevity>...
        ]
    }

For more information, see `Working with AWS Elemental MediaConvert Job Templates <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-job-templates.html>`__ in the *AWS Elemental MediaConvert User Guide*.
