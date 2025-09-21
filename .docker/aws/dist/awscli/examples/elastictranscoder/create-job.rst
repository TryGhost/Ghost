**To create a job for ElasticTranscoder**

The following ``create-job`` example creates a job for ElasticTranscoder. ::

    aws elastictranscoder create-job \
        --pipeline-id 1111111111111-abcde1 \
        --inputs file://inputs.json \
        --outputs file://outputs.json \
        --output-key-prefix "recipes/" \
        --user-metadata file://user-metadata.json  

Contents of ``inputs.json``::

    [{
        "Key":"ETS_example_file.mp4",
        "FrameRate":"auto",
        "Resolution":"auto",
        "AspectRatio":"auto",
        "Interlaced":"auto",
        "Container":"mp4"
    }]
   
Contents of outputs.json::

    [
        {
            "Key":"webm/ETS_example_file-kindlefirehd.webm",
            "Rotate":"0",
            "PresetId":"1351620000001-100250"
        }
    ]

Contents of ``user-metadata.json``::

    {
        "Food type":"Italian",
        "Cook book":"recipe notebook"
    }

Output::

    {
        "Job": {
            "Status": "Submitted",
            "Inputs": [
                {
                    "Container": "mp4",
                    "FrameRate": "auto",
                    "Key": "ETS_example_file.mp4",
                    "AspectRatio": "auto",
                    "Resolution": "auto",
                    "Interlaced": "auto"
                }
            ],
            "Playlists": [],
            "Outputs": [
                {
                    "Status": "Submitted",
                    "Rotate": "0",
                    "PresetId": "1351620000001-100250",
                    "Watermarks": [],
                    "Key": "webm/ETS_example_file-kindlefirehd.webm",
                    "Id": "1"
                }
            ],
            "PipelineId": "3333333333333-abcde3",
            "OutputKeyPrefix": "recipes/",
            "UserMetadata": {
                "Cook book": "recipe notebook",
                "Food type": "Italian"
            },
            "Output": {
                "Status": "Submitted",
                "Rotate": "0",
                "PresetId": "1351620000001-100250",
                "Watermarks": [],
                "Key": "webm/ETS_example_file-kindlefirehd.webm",
                "Id": "1"
            },
            "Timing": {
                "SubmitTimeMillis": 1533838012298
            },
            "Input": {
                "Container": "mp4",
                "FrameRate": "auto",
                "Key": "ETS_example_file.mp4",
                "AspectRatio": "auto",
                "Resolution": "auto",
                "Interlaced": "auto"
            },
            "Id": "1533838012294-example",
            "Arn": "arn:aws:elastictranscoder:us-west-2:123456789012:job/1533838012294-example"
        }
    }
