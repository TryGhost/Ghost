**To create a resource gateway**

The following ``create-resource-gateway`` example creates a resource gateway for the specified subnet. ::

    aws vpc-lattice create-resource-gateway \ 
        --name my-resource-gateway \
        --vpc-identifier vpc-0bf4c2739bc05a69 \
        --subnet-ids subnet-08e8943905b63a683

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-1:123456789012:resourcegateway/rgw-0bba03f3d56060135",
        "id": "rgw-0bba03f3d56060135",
        "ipAddressType": "IPV4",
        "name": "my-resource-gateway",
        "securityGroupIds": [
            "sg-087ffd596c5fe962c"
        ],
        "status": "ACTIVE",
        "subnetIds": [
            "subnet-08e8943905b63a683"
        ],
        "vpcIdentifier": "vpc-0bf4c2739bc05a694"
    }

For more information, see `Resource gateways in VPC Lattice <https://docs.aws.amazon.com/vpc-lattice/latest/ug/resource-gateway.html>`__ in the *Amazon VPC Lattice User Guide*.
