**To create a filter rule for incoming TCP traffic**

The following ``create-traffic-mirror-filter-rule`` example creates a rule that you can use to mirror all incoming TCP traffic. Before you run this command, use ``create-traffic-mirror-filter`` to create the the traffic mirror filter. ::

    aws ec2 create-traffic-mirror-filter-rule \
        --description 'TCP Rule' \
        --destination-cidr-block 0.0.0.0/0  \
        --protocol 6 \
        --rule-action accept \
        --rule-number 1 \
        --source-cidr-block 0.0.0.0/0 \
        --traffic-direction ingress \
        --traffic-mirror-filter-id tmf-04812ff784b25ae67

Output::

    {
        "TrafficMirrorFilterRule": {
            "DestinationCidrBlock": "0.0.0.0/0",
            "TrafficMirrorFilterId": "tmf-04812ff784b25ae67",
            "TrafficMirrorFilterRuleId": "tmfr-02d20d996673f3732",
            "SourceCidrBlock": "0.0.0.0/0",
            "TrafficDirection": "ingress",
            "Description": "TCP Rule",
            "RuleNumber": 1,
            "RuleAction": "accept",
            "Protocol": 6
        },
        "ClientToken": "4752b573-40a6-4eac-a8a4-a72058761219"
    }

For more information, see `Create a traffic mirror filter <https://docs.aws.amazon.com/vpc/latest/mirroring/create-traffic-mirroring-filter.html>`__ in the *Traffic Mirroring Guide*.
