**To add network services to a Traffic Mirror filter**

The following ``modify-traffic-mirror-filter-network-services`` example adds the Amazon DNS network services to the specified filter. ::

    aws ec2 modify-traffic-mirror-filter-network-services \
        --traffic-mirror-filter-id tmf-04812ff784EXAMPLE \
        --add-network-service amazon-dns

Output::

    {
        "TrafficMirrorFilter": {
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "Production"
                }
            ],
            "EgressFilterRules": [],
            "NetworkServices": [
                "amazon-dns"
            ],
            "TrafficMirrorFilterId": "tmf-04812ff784EXAMPLE",
            "IngressFilterRules": [
                {
                    "SourceCidrBlock": "0.0.0.0/0",
                    "RuleNumber": 1,
                    "DestinationCidrBlock": "0.0.0.0/0",
                    "Description": "TCP Rule",
                    "Protocol": 6,
                    "TrafficDirection": "ingress",
                    "TrafficMirrorFilterId": "tmf-04812ff784EXAMPLE",
                    "RuleAction": "accept",
                    "TrafficMirrorFilterRuleId": "tmf-04812ff784EXAMPLE"
                }
            ]
        }
    }

For more information, see `Modify Traffic Mirror Filter Network Services <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-filter.html#modify-traffic-mirroring-filter-network-services>`__ in the *AWS Traffic Mirroring Guide*.
