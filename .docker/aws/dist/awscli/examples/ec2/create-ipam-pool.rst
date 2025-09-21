**To create an IPAM pool**

The following ``create-ipam-pool`` example creates an IPAM pool.

(Linux)::

    aws ec2 create-ipam-pool \
        --ipam-scope-id ipam-scope-02fc38cd4c48e7d38 \
        --address-family ipv4 \
        --auto-import \
        --allocation-min-netmask-length 16 \
        --allocation-max-netmask-length 26 \
        --allocation-default-netmask-length 24 \
        --allocation-resource-tags "Key=Environment,Value=Preprod" \
        --tag-specifications 'ResourceType=ipam-pool,Tags=[{Key=Name,Value="Preprod pool"}]'

(Windows)::
    
    aws ec2 create-ipam-pool ^
        --ipam-scope-id ipam-scope-02fc38cd4c48e7d38 ^
        --address-family ipv4 ^
        --auto-import ^
        --allocation-min-netmask-length 16 ^
        --allocation-max-netmask-length 26 ^
        --allocation-default-netmask-length 24 ^
        --allocation-resource-tags "Key=Environment,Value=Preprod" ^
        --tag-specifications ResourceType=ipam-pool,Tags=[{Key=Name,Value="Preprod pool"}]

Output::

    {
        "IpamPool": {
            "OwnerId": "123456789012",
            "IpamPoolId": "ipam-pool-0533048da7d823723",
            "IpamPoolArn": "arn:aws:ec2::123456789012:ipam-pool/ipam-pool-0533048da7d823723",
            "IpamScopeArn": "arn:aws:ec2::123456789012:ipam-scope/ipam-scope-02fc38cd4c48e7d38",
            "IpamScopeType": "private",
            "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
            "IpamRegion": "us-east-1",
            "Locale": "None",
            "PoolDepth": 1,
            "State": "create-in-progress",
            "AutoImport": true,
            "AddressFamily": "ipv4",
            "AllocationMinNetmaskLength": 16,
            "AllocationMaxNetmaskLength": 26,
            "AllocationDefaultNetmaskLength": 24,
            "AllocationResourceTags": [
                {
                    "Key": "Environment",
                    "Value": "Preprod"
                }
            ],
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "Preprod pool"
                }
            ]
        }
    }

For more information, see `Plan for IP address provisioning <https://docs.aws.amazon.com/vpc/latest/ipam/planning-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 