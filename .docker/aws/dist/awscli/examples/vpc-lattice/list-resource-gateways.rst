**To list your resource gateways**

The following ``list-resource-gateways`` example lists your resource gateways. ::

    aws vpc-lattice list-resource-gateways

Output::

    {
        "items": [
            {
                "arn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourcegateway/rgw-0bba03f3d56060135",
                "createdAt": "2025-02-01T00:57:33.241000+00:00",
                "id": "rgw-0bba03f3d56060135",
                "ipAddressType": "IPV4",
                "lastUpdatedAt": "2025-02-01T00:57:44.351000+00:00",
                "name": "my-resource-gateway",
                "seurityGroupIds": [
                    "sg-087ffd596c5fe962c"
                ],
                "status": "ACTIVE",
                "subnetIds": [
                    "subnet-08e8943905b63a683"
                ],
                "vpcIdentifier": "vpc-0bf4c2739bc05a694"
            }
        ]
    }

For more information, see `Resource gateways in VPC Lattice <https://docs.aws.amazon.com/vpc-lattice/latest/ug/resource-gateway.html>`__ in the *Amazon VPC Lattice User Guide*.
