**To simulate a pipeline activity**

The following ``run-pipeline-activity`` example simulates the results of running a pipeline activity on a message payload. ::

    aws iotanalytics run-pipeline-activity \
        --cli-binary-format raw-in-base64-out \
        --pipeline-activity file://maths.json \
        --payloads file://payloads.json

Contents of ``maths.json``::

    {
        "math": {
            "name": "MyMathActivity",
            "math": "((temp - 32) * 5.0) / 9.0",
            "attribute": "tempC"
        }
    }

Contents of ``payloads.json``::

    [
        "{\"humidity\": 52, \"temp\": 68 }",
        "{\"humidity\": 52, \"temp\": 32 }"
    ]

Output::

    {
        "logResult": "",
        "payloads": [
            "eyJodW1pZGl0eSI6NTIsInRlbXAiOjY4LCJ0ZW1wQyI6MjB9",
            "eyJodW1pZGl0eSI6NTIsInRlbXAiOjMyLCJ0ZW1wQyI6MH0="
        ]
    }

For more information, see `RunPipelineActivity <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_RunPipelineActivity.html>`__ in the *AWS IoT Analytics API Reference*.
