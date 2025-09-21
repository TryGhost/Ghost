**To modify an IPAM pool**

The following ``modify-ipam-pool`` example modifies an IPAM pool.

(Linux)::

    aws ec2 modify-ipam-pool \
        --ipam-pool-id ipam-pool-0533048da7d823723 \
        --add-allocation-resource-tags "Key=Owner,Value=Build Team" \
        --clear-allocation-default-netmask-length \
        --allocation-min-netmask-length 14

(Windows)::

    aws ec2 modify-ipam-pool ^
        --ipam-pool-id ipam-pool-0533048da7d823723 ^
        --add-allocation-resource-tags "Key=Owner,Value=Build Team" ^
        --clear-allocation-default-netmask-length ^
        --allocation-min-netmask-length 14

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
            "State": "modify-complete",
            "AutoImport": true,
            "AddressFamily": "ipv4",
            "AllocationMinNetmaskLength": 14,
            "AllocationMaxNetmaskLength": 26,
            "AllocationResourceTags": [
                {
                    "Key": "Environment",
                    "Value": "Preprod"
                },
                {
                    "Key": "Owner",
                    "Value": "Build Team"
                }
            ]
        }
    }

For more information, see `Edit a pool  <https://docs.aws.amazon.com/vpc/latest/ipam/mod-pool-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 