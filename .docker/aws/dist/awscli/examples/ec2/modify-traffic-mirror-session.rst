**To modify a traffic mirror session**

The following ``modify-traffic-mirror-session`` example changes the traffic mirror session description and the number of packets to mirror. ::

    aws ec2 modify-traffic-mirror-session \
        --description "Change packet length" \
        --traffic-mirror-session-id tms-08a33b1214EXAMPLE \
        --remove-fields "packet-length"

Output::

    {
        "TrafficMirrorSession": {
            "TrafficMirrorSessionId": "tms-08a33b1214EXAMPLE",
            "TrafficMirrorTargetId": "tmt-07f75d8feeEXAMPLE",
            "TrafficMirrorFilterId": "tmf-04812ff784EXAMPLE",
            "NetworkInterfaceId": "eni-070203f901EXAMPLE",
            "OwnerId": "111122223333",
            "SessionNumber": 1,
            "VirtualNetworkId": 7159709,
            "Description": "Change packet length",
            "Tags": []
        }
    }

For more information, see `Modify your traffic mirror session <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-session.html#modify-traffic-mirroring-session>`__ in the *Traffic Mirroring Guide*.