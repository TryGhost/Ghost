**To modify an IPAM**

The following ``modify-ipam`` example modifies an IPAM by adding an Operating Region.

(Linux)::

    aws ec2 modify-ipam \
        --ipam-id ipam-08440e7a3acde3908 \
        --add-operating-regions RegionName=us-west-2

(Windows)::

    aws ec2 modify-ipam ^
        --ipam-id ipam-08440e7a3acde3908 ^
        --add-operating-regions RegionName=us-west-2

Output::

    {
        "Ipam": {
            "OwnerId": "123456789012",
            "IpamId": "ipam-08440e7a3acde3908",
            "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
            "IpamRegion": "us-east-1",
            "PublicDefaultScopeId": "ipam-scope-0b9eed026396dbc16",
            "PrivateDefaultScopeId": "ipam-scope-02fc38cd4c48e7d38",
            "ScopeCount": 3,
            "OperatingRegions": [
                {
                    "RegionName": "us-east-1"
                },
                {
                    "RegionName": "us-east-2"
                },
                {
                    "RegionName": "us-west-1"
                },
                {
                    "RegionName": "us-west-2"
                }
            ],
            "State": "modify-in-progress"
        }
    }