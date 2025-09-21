**To update the source of an existing flow**

The following ``update-flow-source`` example updates the source of an existing flow. ::

    aws mediaconnect update-flow-source \
        --flow-arn arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow \
        --source-arn arn:aws:mediaconnect:us-east-1:111122223333:source:3-4aBC56dEF78hiJ90-4de5fG6Hi78Jk:ShowSource \
        --description 'Friday night show' \
        --ingest-port 3344 \
        --protocol rtp-fec \
        --whitelist-cidr 10.24.34.0/23

Output::

    {
        "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow",
        "Source": {
            "IngestIp": "34.210.136.56",
            "WhitelistCidr": "10.24.34.0/23",
            "Transport": {
                "Protocol": "rtp-fec"
            },
            "IngestPort": 3344,
            "Name": "ShowSource",
            "Description": "Friday night show",
            "SourceArn": "arn:aws:mediaconnect:us-east-1:111122223333:source:3-4aBC56dEF78hiJ90-4de5fG6Hi78Jk:ShowSource"
        }
    }

For more information, see `Updating the Source of a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/source-update.html>`__ in the *AWS Elemental MediaConnect User Guide*.
