**To add outputs to a flow**

The following ``add-flow-outputs`` example adds outputs to the specified flow. ::

    aws mediaconnect add-flow-outputs \
    --flow-arn arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame \
    --outputs Description='NYC stream',Destination=192.0.2.12,Name=NYC,Port=3333,Protocol=rtp-fec,SmoothingLatency=100 Description='LA stream',Destination=203.0.113.9,Name=LA,Port=4444,Protocol=rtp-fec,SmoothingLatency=100

Output::

    {
        "Outputs": [
            {
                "Port": 3333,
                "OutputArn": "arn:aws:mediaconnect:us-east-1:111122223333:output:2-3aBC45dEF67hiJ89-c34de5fG678h:NYC",
                "Name": "NYC",
                "Description": "NYC stream",
                "Destination": "192.0.2.12",
                "Transport": {
                    "Protocol": "rtp-fec",
                    "SmoothingLatency": 100
                }
            },
            {
                "Port": 4444,
                "OutputArn": "arn:aws:mediaconnect:us-east-1:111122223333:output:2-987655dEF67hiJ89-c34de5fG678h:LA",
                "Name": "LA",
                "Description": "LA stream",
                "Destination": "203.0.113.9",
                "Transport": {
                    "Protocol": "rtp-fec",
                    "SmoothingLatency": 100
                }
            }
        ],
        "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame"
    }

For more information, see `Adding Outputs to a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/outputs-add.html>`__ in the *AWS Elemental MediaConnect User Guide*.
