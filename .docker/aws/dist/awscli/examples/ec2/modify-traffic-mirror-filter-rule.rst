**To modify a traffic mirror filter rule**

The following ``modify-traffic-mirror-filter-rule`` example modifies the description of the specified traffic mirror filter rule. ::

    aws ec2 modify-traffic-mirror-filter-rule \
        --traffic-mirror-filter-rule-id tmfr-0ca76e0e08EXAMPLE \
        --description "TCP Rule"

Output::

    {
        "TrafficMirrorFilterRule": {
            "TrafficMirrorFilterRuleId": "tmfr-0ca76e0e08EXAMPLE",
            "TrafficMirrorFilterId": "tmf-0293f26e86EXAMPLE",
            "TrafficDirection": "ingress",
            "RuleNumber": 100,
            "RuleAction": "accept",
            "Protocol": 6,
            "DestinationCidrBlock": "10.0.0.0/24",
            "SourceCidrBlock": "10.0.0.0/24",
            "Description": "TCP Rule"
        }
    }           

For more information, see `Modify Your Traffic Mirror Filter Rules <https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-filter.html#modify-traffic-mirroring-filter-rules>`__ in the *AWS Traffic Mirroring Guide*.
