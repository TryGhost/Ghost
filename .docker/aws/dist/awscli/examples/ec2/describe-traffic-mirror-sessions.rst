**To describe a Traffic Mirror Session**

The following ``describe-traffic-mirror-sessions`` example displays details of the your Traffic Mirror sessions. ::

    aws ec2 describe-traffic-mirror-sessions

Output::

    {
        "TrafficMirrorSessions": [
            {
                "Tags": [],
                "VirtualNetworkId": 42,
                "OwnerId": "111122223333",
                "Description": "TCP Session",
                "NetworkInterfaceId": "eni-0a471a5cf3EXAMPLE",
                "TrafficMirrorTargetId": "tmt-0dabe9b0a6EXAMPLE",
                "TrafficMirrorFilterId": "tmf-083e18f985EXAMPLE",
                "PacketLength": 20,
                "SessionNumber": 1,
                "TrafficMirrorSessionId": "tms-0567a4c684EXAMPLE"
            },
            {
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "tag test"
                    }
                ],
                "VirtualNetworkId": 13314501,
                "OwnerId": "111122223333",
                "Description": "TCP Session",
                "NetworkInterfaceId": "eni-0a471a5cf3EXAMPLE",
                "TrafficMirrorTargetId": "tmt-03665551cbEXAMPLE",
                "TrafficMirrorFilterId": "tmf-06c787846cEXAMPLE",
                "SessionNumber": 2,
                "TrafficMirrorSessionId": "tms-0060101cf8EXAMPLE"
            }
        ]
    }

For more information, see `View Traffic Mirror Session Details <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-session.html#view-traffic-mirroring-session>`__ in the *AWS Traffic Mirroring Guide*.