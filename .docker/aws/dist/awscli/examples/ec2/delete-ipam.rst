**To delete an IPAM**

The following ``delete-ipam`` example deletes an IPAM. ::

    aws ec2 delete-ipam \
        --ipam-id ipam-036486dfa6af58ee0

Output::

    {
        "Ipam": {
            "OwnerId": "123456789012",
            "IpamId": "ipam-036486dfa6af58ee0",
            "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-036486dfa6af58ee0",
            "IpamRegion": "us-east-1",
            "PublicDefaultScopeId": "ipam-scope-071b8042b0195c183",
            "PrivateDefaultScopeId": "ipam-scope-0807405dece705a30",
            "ScopeCount": 2,
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
            "State": "delete-in-progress"
        }
    }

For more information, see `Delete an IPAM  <https://docs.aws.amazon.com/vpc/latest/ipam/delete-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 