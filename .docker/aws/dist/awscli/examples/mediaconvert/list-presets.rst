**Example 1: To list your custom output presets**

The following ``list-presets`` example lists your custom output presets. To list the system presets, see the next example. ::

    aws mediaconvert list-presets \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

Output::

    {
        "Presets": [
            {
                "Name": "SimpleMP4",
                "CreatedAt": 1568841521,
                "Settings": {
                    ......
                },
                "Arn": "arn:aws:mediaconvert:us-east-1:003235472598:presets/SimpleMP4",
                "Type": "CUSTOM",
                "LastUpdated": 1568843141,
                "Description": "Creates basic MP4 file. No filtering or preproccessing."
            },
            {
                "Name": "SimpleTS",
                "CreatedAt": 1568843113,
                "Settings": {
                    ... truncated for brevity ...
                },
                "Arn": "arn:aws:mediaconvert:us-east-1:003235472598:presets/SimpleTS",
                "Type": "CUSTOM",
                "LastUpdated": 1568843113,
                "Description": "Create a basic transport stream."
            }
        ]
    }

**Example 2: To list the system output presets**

The following ``list-presets`` example lists the available MediaConvert system presets. To list your custom presets, see the previous example. ::

    aws mediaconvert list-presets \
        --list-by SYSTEM \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com

Output::

    {
        "Presets": [
            {
                "Arn": "arn:aws:mediaconvert:us-west-2:123456789012:presets/System-Avc_16x9_1080p_29_97fps_8500kbps",
                "Name": "System-Avc_16x9_1080p_29_97fps_8500kbps",
                "CreatedAt": 1568321789,
                "Description": "Wifi, 1920x1080, 16:9, 29.97fps, 8500kbps",
                "LastUpdated": 1568321789,
                "Type": "SYSTEM",
                "Category": "HLS",
                "Settings": {
                ...<output settings removed for brevity>... 
                }
            },
            
            ...<list of presets shortened for brevity>...
            
            {
                "Arn": "arn:aws:mediaconvert:us-east-1:123456789012:presets/System-Xdcam_HD_1080i_29_97fps_35mpbs",
                "Name": "System-Xdcam_HD_1080i_29_97fps_35mpbs",
                "CreatedAt": 1568321790,
                "Description": "XDCAM MPEG HD, 1920x1080i, 29.97fps, 35mbps",
                "LastUpdated": 1568321790,
                "Type": "SYSTEM",
                "Category": "MXF",
                "Settings": {
                ...<output settings removed for brevity>... 
                }
            }
        ]
    }

For more information, see `Working with AWS Elemental MediaConvert Output Presets <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-presets.html>`__ in the *AWS Elemental MediaConvert User Guide*.
