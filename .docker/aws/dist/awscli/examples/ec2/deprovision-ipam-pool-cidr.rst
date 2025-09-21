**To deprovision an IPAM pool CIDR**

The following ``deprovision-ipam-pool-cidr`` example deprovisions a CIDR provisioned to an IPAM pool.

(Linux)::

    aws ec2 deprovision-ipam-pool-cidr \
        --ipam-pool-id ipam-pool-02ec043a19bbe5d08 \
        --cidr 11.0.0.0/16

(Windows)::

    aws ec2 deprovision-ipam-pool-cidr ^
        --ipam-pool-id ipam-pool-02ec043a19bbe5d08 ^
        --cidr 11.0.0.0/16

Output::

    {
        "IpamPoolCidr": {
            "Cidr": "11.0.0.0/16",
            "State": "pending-deprovision"
        }
    }

For more information, see `Deprovision pool CIDRs <https://docs.aws.amazon.com/vpc/latest/ipam/depro-pool-cidr-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 
