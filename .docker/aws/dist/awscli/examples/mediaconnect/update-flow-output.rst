**To update an output on a flow**

The following ``update-flow-output`` example update an output on the specified flow. ::

    aws mediaconnect update-flow-output \
        --flow-arn arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame \
        --output-arn arn:aws:mediaconnect:us-east-1:111122223333:output:2-3aBC45dEF67hiJ89-c34de5fG678h:NYC \
        --port 3331

Output::

    {
        "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame",
        "Output": {
            "Name": "NYC",
            "Port": 3331,
            "Description": "NYC stream",
            "Transport": {
                "Protocol": "rtp-fec",
                "SmoothingLatency": 100
            },
            "OutputArn": "arn:aws:mediaconnect:us-east-1:111122223333:output:2-3aBC45dEF67hiJ89-c34de5fG678h:NYC",
            "Destination": "192.0.2.12"
        }
    }

For more information, see `Updating Outputs on a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/outputs-update.html>`__ in the *AWS Elemental MediaConnect User Guide*.
