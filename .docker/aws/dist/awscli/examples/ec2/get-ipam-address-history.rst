**To get the history of a CIDR**

The following ``get-ipam-address-history`` example gets the history of a CIDR.

(Linux)::

     aws ec2 get-ipam-address-history \
        --cidr 10.0.0.0/16 \
        --ipam-scope-id ipam-scope-02fc38cd4c48e7d38 \
        --start-time 2021-12-08T01:00:00.000Z \
        --end-time 2021-12-10T01:00:00.000Z

(Windows)::

     aws ec2 get-ipam-address-history ^
        --cidr 10.0.0.0/16 ^
        --ipam-scope-id ipam-scope-02fc38cd4c48e7d38 ^
        --start-time 2021-12-08T01:00:00.000Z ^
        --end-time 2021-12-10T01:00:00.000Z

Output::

    {
        "HistoryRecords": [
            {
                "ResourceOwnerId": "123456789012",
                "ResourceRegion": "us-west-1",
                "ResourceType": "vpc",
                "ResourceId": "vpc-06cbefa9ee907e1c0",
                "ResourceCidr": "10.0.0.0/16",
                "ResourceName": "Demo",
                "ResourceComplianceStatus": "unmanaged",
                "ResourceOverlapStatus": "overlapping",
                "VpcId": "vpc-06cbefa9ee907e1c0",
                "SampledStartTime": "2021-12-08T19:54:57.675000+00:00"
            },
            {
                "ResourceOwnerId": "123456789012",
                "ResourceRegion": "us-east-2",
                "ResourceType": "vpc",
                "ResourceId": "vpc-042702f474812c9ad",
                "ResourceCidr": "10.0.0.0/16",
                "ResourceName": "test",
                "ResourceComplianceStatus": "unmanaged",
                "ResourceOverlapStatus": "overlapping",
                "VpcId": "vpc-042702f474812c9ad",
                "SampledStartTime": "2021-12-08T19:54:59.019000+00:00"
            },
            {
                "ResourceOwnerId": "123456789012",
                "ResourceRegion": "us-east-2",
                "ResourceType": "vpc",
                "ResourceId": "vpc-042b8a44f64267d67",
                "ResourceCidr": "10.0.0.0/16",
                "ResourceName": "tester",
                "ResourceComplianceStatus": "unmanaged",
                "ResourceOverlapStatus": "overlapping",
                "VpcId": "vpc-042b8a44f64267d67",
                "SampledStartTime": "2021-12-08T19:54:59.019000+00:00"
            }
        ]
    }

For more information, see `View the history of IP addresses <https://docs.aws.amazon.com/vpc/latest/ipam/view-history-cidr-ipam.html>`__ in the *Amazon VPC IPAM User Guide*. 