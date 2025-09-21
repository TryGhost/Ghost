**To create a a Network Load Balancer traffic mirror target**

The following ``create-traffic-mirror-target`` example creates a  Network Load Balancer traffic mirror target. ::
    
    aws ec2 create-traffic-mirror-target \
        --description 'Example Network Load Balancer Target' \
        --network-load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:111122223333:loadbalancer/net/NLB/7cdec873EXAMPLE

Output::

    {
        "TrafficMirrorTarget": {
            "Type": "network-load-balancer",
            "Tags": [],
            "Description": "Example Network Load Balancer Target",
            "OwnerId": "111122223333",
            "NetworkLoadBalancerArn": "arn:aws:elasticloadbalancing:us-east-1:724145273726:loadbalancer/net/NLB/7cdec873EXAMPLE",
            "TrafficMirrorTargetId": "tmt-0dabe9b0a6EXAMPLE"
        },
        "ClientToken": "d5c090f5-8a0f-49c7-8281-72c796a21f72"
    }

**To create a network traffic mirror target**

The following ``create-traffic-mirror-target`` example creates a network interface Traffic Mirror target. ::

    aws ec2 create-traffic-mirror-target \
        --description 'Network interface target' \
        --network-interface-id eni-eni-01f6f631eEXAMPLE

Output::

    {
        "ClientToken": "5289a345-0358-4e62-93d5-47ef3061d65e",
        "TrafficMirrorTarget": {
            "Description": "Network interface target",
            "NetworkInterfaceId": "eni-01f6f631eEXAMPLE",
            "TrafficMirrorTargetId": "tmt-02dcdbe2abEXAMPLE",
            "OwnerId": "111122223333",
            "Type": "network-interface",
            "Tags": []
        }
    }

For more information, see `Create a traffic mirror target <https://docs.aws.amazon.com/vpc/latest/mirroring/create-traffic-mirroring-target.html>`__ in the *Traffic Mirroring Guide*.