**To view the details of a flow**

The following ``describe-flow`` example displays the specified flow's details, such as ARN, Availability Zone, status, source, entitlements, and outputs. ::

    aws mediaconnect describe-flow \
        --flow-arn arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow

Output::

    {
        "Flow": {
            "EgressIp": "54.201.4.39",
            "AvailabilityZone": "us-west-2c",
            "Status": "ACTIVE",
            "FlowArn": "arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow",
            "Entitlements": [
                {
                    "EntitlementArn": "arn:aws:mediaconnect:us-west-2:123456789012:entitlement:1-AaBb11CcDd22EeFf-34DE5fG12AbC:MyEntitlement",
                    "Description": "Assign to this account",
                    "Name": "MyEntitlement",
                    "Subscribers": [
                        "444455556666"
                    ]
                }
            ],
            "Description": "NYC awards show",
            "Name": "AwardsShow",
            "Outputs": [
                {
                    "Port": 2355,
                    "Name": "NYC",
                    "Transport": {
                        "SmoothingLatency": 0,
                        "Protocol": "rtp-fec"
                    },
                    "OutputArn": "arn:aws:mediaconnect:us-east-1:123456789012:output:2-3aBC45dEF67hiJ89-c34de5fG678h:NYC",
                    "Destination": "192.0.2.0"
                },
                {
                    "Port": 3025,
                    "Name": "LA",
                    "Transport": {
                        "SmoothingLatency": 0,
                        "Protocol": "rtp-fec"
                    },
                    "OutputArn": "arn:aws:mediaconnect:us-east-1:123456789012:output:2-987655dEF67hiJ89-c34de5fG678h:LA",
                    "Destination": "192.0.2.0"
                }
            ],
            "Source": {
                "IngestIp": "54.201.4.39",
                "SourceArn": "arn:aws:mediaconnect:us-east-1:123456789012:source:3-4aBC56dEF78hiJ90-4de5fG6Hi78Jk:ShowSource",
                "Transport": {
                    "MaxBitrate": 80000000,
                    "Protocol": "rtp"
                },
                "IngestPort": 1069,
                "Description": "Saturday night show",
                "Name": "ShowSource",
                "WhitelistCidr": "10.24.34.0/23"
            }
        }
    }

For more information, see `Viewing the Details of a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/flows-view-details.html>`__ in the *AWS Elemental MediaConnect User Guide*.
