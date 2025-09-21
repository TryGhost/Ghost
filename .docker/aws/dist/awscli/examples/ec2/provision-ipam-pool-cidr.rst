**To provision a CIDR to an IPAM pool**

The following ``provision-ipam-pool-cidr`` example provisions a CIDR to an IPAM pool.

(Linux)::

    aws ec2 provision-ipam-pool-cidr \
        --ipam-pool-id ipam-pool-0533048da7d823723 \
        --cidr 10.0.0.0/24

(Windows)::

    aws ec2 provision-ipam-pool-cidr ^
        --ipam-pool-id ipam-pool-0533048da7d823723 ^
        --cidr 10.0.0.0/24

Output::

    {
        "IpamPoolCidr": {
            "Cidr": "10.0.0.0/24",
            "State": "pending-provision"
        }
    }

For more information, see `Provision CIDRs to a pool <https://docs.aws.amazon.com/vpc/latest/ipam/prov-cidr-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 