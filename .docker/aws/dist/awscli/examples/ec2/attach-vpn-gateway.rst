**To attach a virtual private gateway to your VPC**

The following ``attach-vpn-gateway`` example attaches the specified virtual private gateway to the specified VPC. ::

    aws ec2 attach-vpn-gateway \
        --vpn-gateway-id vgw-9a4cacf3 \
        --vpc-id vpc-a01106c2

Output::

    {
        "VpcAttachment": {
            "State": "attaching",
            "VpcId": "vpc-a01106c2"
        }
    }

