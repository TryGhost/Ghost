**To view the details for an IPAM pool**

The following ``describe-ipam-pools`` example shows the details for pools.

(Linux)::

    aws ec2 describe-ipam-pools \
        --filters Name=owner-id,Values=123456789012 Name=ipam-scope-id,Values=ipam-scope-02fc38cd4c48e7d38

(Windows)::

    aws ec2 describe-ipam-pools ^
        --filters Name=owner-id,Values=123456789012 Name=ipam-scope-id,Values=ipam-scope-02fc38cd4c48e7d38

Output::

    {
        "IpamPools": [
            {
                "OwnerId": "123456789012",
                "IpamPoolId": "ipam-pool-02ec043a19bbe5d08",
                "IpamPoolArn": "arn:aws:ec2::123456789012:ipam-pool/ipam-pool-02ec043a19bbe5d08",
                "IpamScopeArn": "arn:aws:ec2::123456789012:ipam-scope/ipam-scope-02fc38cd4c48e7d38",
                "IpamScopeType": "private",
                "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
                "IpamRegion": "us-east-1",
                "Locale": "None",
                "PoolDepth": 1,
                "State": "create-complete",
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
        ]
    }