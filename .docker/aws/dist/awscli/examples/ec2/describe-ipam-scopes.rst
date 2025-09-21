**To view the details for an IPAM scope**

The following ``describe-ipam-scopes`` example shows the details for scopes. ::

    aws ec2 describe-ipam-scopes \
        --filters Name=owner-id,Values=123456789012 Name=ipam-id,Values=ipam-08440e7a3acde3908

Output::

    {
        "IpamScopes": [
            {
                "OwnerId": "123456789012",
                "IpamScopeId": "ipam-scope-02fc38cd4c48e7d38",
                "IpamScopeArn": "arn:aws:ec2::123456789012:ipam-scope/ipam-scope-02fc38cd4c48e7d38",
                "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
                "IpamRegion": "us-east-1",
                "IpamScopeType": "private",
                "IsDefault": true,
                "PoolCount": 2,
                "State": "create-complete",
                "Tags": []
            },
            {
                "OwnerId": "123456789012",
                "IpamScopeId": "ipam-scope-0b9eed026396dbc16",
                "IpamScopeArn": "arn:aws:ec2::123456789012:ipam-scope/ipam-scope-0b9eed026396dbc16",
                "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
                "IpamRegion": "us-east-1",
                "IpamScopeType": "public",
                "IsDefault": true,
                "PoolCount": 0,
                "State": "create-complete",
                "Tags": []
            },
            {
                "OwnerId": "123456789012",
                "IpamScopeId": "ipam-scope-0f1aff29486355c22",
                "IpamScopeArn": "arn:aws:ec2::123456789012:ipam-scope/ipam-scope-0f1aff29486355c22",
                "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
                "IpamRegion": "us-east-1",
                "IpamScopeType": "private",
                "IsDefault": false,
                "Description": "Example description",
                "PoolCount": 0,
                "State": "create-complete",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "Example name value"
                    }
                ]
            }
        ]
    }