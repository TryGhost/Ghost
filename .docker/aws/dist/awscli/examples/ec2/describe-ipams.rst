**To view the details for an IPAM**

The following ``describe-ipams`` example shows the details of an IPAM. ::

    aws ec2 describe-ipams \
        --filters Name=owner-id,Values=123456789012

Output::

    {
        "Ipams": [
            {
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
                    }
                ],
                "State": "create-complete",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "ExampleIPAM"
                    }
                ]
            }
        ]
    }