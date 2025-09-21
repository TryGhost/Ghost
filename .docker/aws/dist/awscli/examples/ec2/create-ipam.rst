**To create an IPAM**

The following ``create-ipam`` example creates an IPAM.

(Linux)::

    aws ec2 create-ipam \
        --description "Example description" \
        --operating-regions "RegionName=us-east-2" "RegionName=us-west-1" \
        --tag-specifications 'ResourceType=ipam,Tags=[{Key=Name,Value=ExampleIPAM}]'

(Windows)::

    aws ec2 create-ipam ^
        --description "Example description" ^
        --operating-regions "RegionName=us-east-2" "RegionName=us-west-1" ^
        --tag-specifications ResourceType=ipam,Tags=[{Key=Name,Value=ExampleIPAM}]

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
                    "RegionName": "us-east-2"
                },
                {
                    "RegionName": "us-west-1"
                },
                {
                    "RegionName": "us-east-1"
                }
            ],
            "State": "create-in-progress",
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "ExampleIPAM"
                }
            ]
        }
    }

For more information, see `Create an IPAM <https://docs.aws.amazon.com/vpc/latest/ipam/create-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 