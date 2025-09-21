**To create an IPAM scope**

The following ``create-ipam-scope`` example creates an IPAM scope.

(Linux)::

    aws ec2 create-ipam-scope \
        --ipam-id ipam-08440e7a3acde3908 \
        --description "Example description" \
        --tag-specifications 'ResourceType=ipam-scope,Tags=[{Key=Name,Value="Example name value"}]'

(Windows)::

    aws ec2 create-ipam-scope ^
        --ipam-id ipam-08440e7a3acde3908 ^
        --description "Example description" ^
        --tag-specifications ResourceType=ipam-scope,Tags=[{Key=Name,Value="Example name value"}]

Output::

    {
        "IpamScope": {
            "OwnerId": "123456789012",
            "IpamScopeId": "ipam-scope-01c1ebab2b63bd7e4",
            "IpamScopeArn": "arn:aws:ec2::123456789012:ipam-scope/ipam-scope-01c1ebab2b63bd7e4",
            "IpamArn": "arn:aws:ec2::123456789012:ipam/ipam-08440e7a3acde3908",
            "IpamRegion": "us-east-1",
            "IpamScopeType": "private",
            "IsDefault": false,
            "Description": "Example description",
            "PoolCount": 0,
            "State": "create-in-progress",
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "Example name value"
                }
            ]
        }
    }

For more information, see `Create additional scopes <https://docs.aws.amazon.com/vpc/latest/ipam/add-scope-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 