**To retrieve a list of ElasticTranscoder presets**

This example retrieves a list of ElasticTranscoder presets.

Command::

  aws elastictranscoder list-presets --max-items 2

Output::
	
  {
    "Presets": [
        {
            "Container": "mp4",
            "Name": "KindleFireHD-preset",
            "Video": {
                "Resolution": "1280x720",
                "FrameRate": "30",
                "KeyframesMaxDist": "90",
                "FixedGOP": "false",
                "Codec": "H.264",
                "Watermarks": [],
                "CodecOptions": {
                    "Profile": "main",
                    "MaxReferenceFrames": "3",
                    "ColorSpaceConversionMode": "None",
                    "InterlacedMode": "Progressive",
                    "Level": "4"
                },
                "AspectRatio": "16:9",
                "BitRate": "2200"
            },
            "Audio": {
                "Channels": "2",
                "CodecOptions": {
                    "Profile": "AAC-LC"
                },
                "SampleRate": "48000",
                "Codec": "AAC",
                "BitRate": "160"
            },
            "Type": "Custom",
            "Id": "3333333333333-abcde2",
            "Arn": "arn:aws:elastictranscoder:us-west-2:123456789012:preset/3333333333333-abcde2",
            "Thumbnails": {
                "AspectRatio": "16:9",
                "Interval": "60",
                "Resolution": "192x108",
                "Format": "png"
            }
        },
        {
            "Thumbnails": {
                "AspectRatio": "16:9",
                "Interval": "60",
                "Resolution": "192x108",
                "Format": "png"
            },
            "Container": "mp4",
            "Description": "Custom preset for transcoding jobs",
            "Video": {
                "Resolution": "1280x720",
                "FrameRate": "30",
                "KeyframesMaxDist": "90",
                "FixedGOP": "false",
                "Codec": "H.264",
                "Watermarks": [],
                "CodecOptions": {
                    "Profile": "main",
                    "MaxReferenceFrames": "3",
                    "ColorSpaceConversionMode": "None",
                    "InterlacedMode": "Progressive",
                    "Level": "3.1"
                },
                "AspectRatio": "16:9",
                "BitRate": "2200"
            },
            "Audio": {
                "Channels": "2",
                "CodecOptions": {
                    "Profile": "AAC-LC"
                },
                "SampleRate": "44100",
                "Codec": "AAC",
                "BitRate": "160"
            },
            "Type": "Custom",
            "Id": "3333333333333-abcde3",
            "Arn": "arn:aws:elastictranscoder:us-west-2:123456789012:preset/3333333333333-abcde3",
            "Name": "Roman's Preset"
        }
    ],
    "NextToken": "eyJQYWdlVG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyfQ=="
  }
 
