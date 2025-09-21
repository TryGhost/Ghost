**To list the VPC endpoint associations**

The following ``list-service-network-vpc-endpoint-associations`` example lists the VPC endpoints associated with the specific service network. ::

    aws vpc-lattice list-service-network-vpc-endpoint-associations \
        --service-network-identifier sn-0808d1748faee0c1e

Output::

    {
        "items": [
            {
                "createdAt": "2025-02-01T01:21:36.667000+00:00",
                "serviceNetworkArn": "arn:aws:vpc-lattice:us-east-1:123456789012:servicenetwork/sn-0808d1748faee0c1e",
                "state": "ACTIVE",
                "vpcEndpointId": "vpce-0cc199f605eaeace7",
                "vpcEndpointOwnerId": "123456789012"
            }
        ]
    }

For more information, see `Manage the associations for a VPC Lattice service network <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html>`__ in the *Amazon VPC Lattice User Guide*.
