**To modify the CIDR allocated to a resource**

The following ``modify-ipam-resource-cidr`` example modifies a resource CIDR.

(Linux)::

    aws ec2 modify-ipam-resource-cidr \
        --current-ipam-scope-id ipam-scope-02fc38cd4c48e7d38 \
        --destination-ipam-scope-id ipam-scope-0da34c61fd189a141 \
        --resource-id vpc-010e1791024eb0af9 \
        --resource-cidr 10.0.1.0/24 \
        --resource-region us-east-1 \
        --monitored

(Windows)::

    aws ec2 modify-ipam-resource-cidr ^
        --current-ipam-scope-id ipam-scope-02fc38cd4c48e7d38 ^
        --destination-ipam-scope-id ipam-scope-0da34c61fd189a141 ^
        --resource-id vpc-010e1791024eb0af9 ^
        --resource-cidr 10.0.1.0/24 ^
        --resource-region us-east-1 ^
        --monitored

Output::

    {
        "IpamResourceCidr": {
            "IpamId": "ipam-08440e7a3acde3908",
            "IpamScopeId": "ipam-scope-0da34c61fd189a141",
            "IpamPoolId": "ipam-pool-0533048da7d823723",
            "ResourceRegion": "us-east-1",
            "ResourceOwnerId": "123456789012",
            "ResourceId": "vpc-010e1791024eb0af9",
            "ResourceCidr": "10.0.1.0/24",
            "ResourceType": "vpc",
            "ResourceTags": [
                {
                    "Key": "Environment",
                    "Value": "Preprod"
                },
                {
                    "Key": "Owner",
                    "Value": "Build Team"
                }
            ],
            "IpUsage": 0.0,
            "ComplianceStatus": "noncompliant",
            "ManagementState": "managed",
            "OverlapStatus": "overlapping",
            "VpcId": "vpc-010e1791024eb0af9"
        }
    }

For more information on moving resources, see `Move resource CIDRs between scopes <https://docs.aws.amazon.com/vpc/latest/ipam/move-resource-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 

For more information on changing monitoring states, see `Change the monitoring state of resource CIDRs <https://docs.aws.amazon.com/vpc/latest/ipam/change-monitoring-state-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 