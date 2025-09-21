**To allocate a CIDR from an IPAM pool**

The following ``allocate-ipam-pool-cidr`` example allocates a CIDR from an IPAM pool.

(Linux)::

    aws ec2 allocate-ipam-pool-cidr \
        --ipam-pool-id ipam-pool-0533048da7d823723 \
        --netmask-length 24

(Windows)::

     aws ec2 allocate-ipam-pool-cidr ^
        --ipam-pool-id ipam-pool-0533048da7d823723 ^
        --netmask-length 24

Output::

    {
        "IpamPoolAllocation": {
            "Cidr": "10.0.0.0/24",
            "IpamPoolAllocationId": "ipam-pool-alloc-018ecc28043b54ba38e2cd99943cebfbd",
            "ResourceType": "custom",
            "ResourceOwner": "123456789012"
        }
    }

For more information, see `Manually allocate a CIDR to a pool to reserve IP address space <https://docs.aws.amazon.com/vpc/latest/ipam/manually-allocate-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 