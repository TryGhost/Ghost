**To create a preset for ElasticTranscoder**

The following ``create-preset`` example creates a preset for ElasticTranscoder. ::

    aws elastictranscoder create-preset \
        --name DefaultPreset \
        --description "Use for published videos" \
        --container mp4 \
        --video file://video.json \
        --audio file://audio.json \
        --thumbnails file://thumbnails.json

Contents of ``video.json``::

    {
        "Codec":"H.264",
        "CodecOptions":{
            "Profile":"main",
            "Level":"2.2",
            "MaxReferenceFrames":"3",
            "MaxBitRate":"",
            "BufferSize":"",
            "InterlacedMode":"Progressive",
            "ColorSpaceConversionMode":"None"
        },
        "KeyframesMaxDist":"240",
        "FixedGOP":"false",
        "BitRate":"1600",
        "FrameRate":"auto",
        "MaxFrameRate":"30",
        "MaxWidth":"auto",
        "MaxHeight":"auto",
        "SizingPolicy":"Fit",
        "PaddingPolicy":"Pad",
        "DisplayAspectRatio":"auto",
        "Watermarks":[
            {
                "Id":"company logo",
                "MaxWidth":"20%",
                "MaxHeight":"20%", 
                "SizingPolicy":"ShrinkToFit",
                "HorizontalAlign":"Right",
                "HorizontalOffset":"10px",
                "VerticalAlign":"Bottom",
                "VerticalOffset":"10px",
                "Opacity":"55.5",
                "Target":"Content"
            }
        ]
    }

Contents of ``audio.json``::

    {
        "Codec":"AAC",
        "CodecOptions":{
            "Profile":"AAC-LC"
        },
        "SampleRate":"44100",
        "BitRate":"96",
        "Channels":"2"
    }

Contents of ``thumbnails.json``::

    {
        "Format":"png",
        "Interval":"120",
        "MaxWidth":"auto",
        "MaxHeight":"auto",
        "SizingPolicy":"Fit",
        "PaddingPolicy":"Pad"
    }


Output::

    {
        "Preset": {
            "Thumbnails": {
                "SizingPolicy": "Fit",
                "MaxWidth": "auto",
                "Format": "png",
                "PaddingPolicy": "Pad",
                "Interval": "120",
                "MaxHeight": "auto"
            },
            "Container": "mp4",
            "Description": "Use for published videos",
            "Video": {
                "SizingPolicy": "Fit",
                "MaxWidth": "auto",
                "PaddingPolicy": "Pad",
                "MaxFrameRate": "30",
                "FrameRate": "auto",
                "MaxHeight": "auto",
                "KeyframesMaxDist": "240",
                "FixedGOP": "false",
                "Codec": "H.264",
                "Watermarks": [
                    {
                        "SizingPolicy": "ShrinkToFit",
                        "VerticalOffset": "10px",
                        "VerticalAlign": "Bottom",
                        "Target": "Content",
                        "MaxWidth": "20%",
                        "MaxHeight": "20%",
                        "HorizontalAlign": "Right",
                        "HorizontalOffset": "10px",
                        "Opacity": "55.5",
                        "Id": "company logo"
                    }
                ],
                "CodecOptions": {
                    "Profile": "main",
                    "MaxBitRate": "32",
                    "InterlacedMode": "Progressive",
                    "Level": "2.2",
                    "ColorSpaceConversionMode": "None",
                    "MaxReferenceFrames": "3",
                    "BufferSize": "5"
                },
                "BitRate": "1600",
                "DisplayAspectRatio": "auto"
            },
            "Audio": {
                "Channels": "2",
                "CodecOptions": {
                    "Profile": "AAC-LC"
                },
                "SampleRate": "44100",
                "Codec": "AAC",
                "BitRate": "96"
            },
            "Type": "Custom",
            "Id": "1533765290724-example"
            "Arn": "arn:aws:elastictranscoder:us-west-2:123456789012:preset/1533765290724-example",
            "Name": "DefaultPreset"
        },
        "Warning": ""
    }
