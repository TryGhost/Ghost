**To get the CIDRs allocated to a resource**

The following ``get-ipam-resource-cidrs`` example gets the CIDRs allocated to a resource.

(Linux)::

    aws ec2 get-ipam-resource-cidrs \
        --ipam-scope-id ipam-scope-02fc38cd4c48e7d38 \
        --filters Name=management-state,Values=unmanaged

(Windows)::

    aws ec2 get-ipam-resource-cidrs ^
        --ipam-scope-id ipam-scope-02fc38cd4c48e7d38 ^
        --filters Name=management-state,Values=unmanaged

Output::

    {
        "IpamResourceCidrs": [
            {
                "IpamId": "ipam-08440e7a3acde3908",
                "IpamScopeId": "ipam-scope-02fc38cd4c48e7d38",
                "ResourceRegion": "us-east-2",
                "ResourceOwnerId": "123456789012",
                "ResourceId": "vpc-621b8709",
                "ResourceName": "Default AWS VPC",
                "ResourceCidr": "172.33.0.0/16",
                "ResourceType": "vpc",
                "ResourceTags": [
                    {
                        "Key": "Environment",
                        "Value": "Test"
                    },
                    {
                        "Key": "Name",
                        "Value": "Default AWS VPC"
                    }
                ],
                "IpUsage": 0.0039,
                "ComplianceStatus": "unmanaged",
                "ManagementState": "unmanaged",
                "OverlapStatus": "nonoverlapping",
                "VpcId": "vpc-621b8709"
            }
        ]
    }

For more information, see `Monitor CIDR usage by resource <https://docs.aws.amazon.com/vpc/latest/ipam/monitor-cidr-compliance-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 