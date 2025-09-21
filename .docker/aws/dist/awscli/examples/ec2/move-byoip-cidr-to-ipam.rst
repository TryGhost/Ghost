**To transfer a BYOIP CIDR to IPAM**

The following ``move-byoip-cidr-to-ipam`` example transfers a BYOIP CIDR to IPAM.

(Linux)::

    aws ec2 move-byoip-cidr-to-ipam \
        --region us-west-2 \
        --ipam-pool-id ipam-pool-0a03d430ca3f5c035 \
        --ipam-pool-owner 111111111111 \
        --cidr 130.137.249.0/24

(Windows)::

    aws ec2 move-byoip-cidr-to-ipam ^
        --region us-west-2 ^
        --ipam-pool-id ipam-pool-0a03d430ca3f5c035 ^
        --ipam-pool-owner 111111111111 ^
        --cidr 130.137.249.0/24


Output::

    {
        "ByoipCidr": {
            "Cidr": "130.137.249.0/24",
            "State": "pending-transfer"
        }
    }

For more information, see `Tutorial: Transfer an existing BYOIP IPv4 CIDR to IPAM <https://docs.aws.amazon.com/vpc/latest/ipam/tutorials-byoip-ipam-transfer-ipv4.html>`__ in the *Amazon VPC IPAM User Guide*.