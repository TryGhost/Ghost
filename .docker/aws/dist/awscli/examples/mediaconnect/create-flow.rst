**To create a flow**

The following ``create-flow`` example creates a flow with the specified configuration. ::

    aws mediaconnect create-flow \
        --availability-zone us-west-2c \
        --name ExampleFlow \
        --source Description='Example source, backup',IngestPort=1055,Name=BackupSource,Protocol=rtp,WhitelistCidr=10.24.34.0/23

Output::

    {
        "Flow": {
            "FlowArn": "arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:ExampleFlow",
            "AvailabilityZone": "us-west-2c",
            "EgressIp": "54.245.71.21",
            "Source": {
                "IngestPort": 1055,
                "SourceArn": "arn:aws:mediaconnect:us-east-1:123456789012:source:2-3aBC45dEF67hiJ89-c34de5fG678h:BackupSource",
                "Transport": {
                    "Protocol": "rtp",
                    "MaxBitrate": 80000000
                },
                "Description": "Example source, backup",
                "IngestIp": "54.245.71.21",
                "WhitelistCidr": "10.24.34.0/23",
                "Name": "mySource"
            },
            "Entitlements": [],
            "Name": "ExampleFlow",
            "Outputs": [],
            "Status": "STANDBY",
            "Description": "Example source, backup"
        }
    }

For more information, see `Creating a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/flows-create.html>`__ in the *AWS Elemental MediaConnect User Guide*.
