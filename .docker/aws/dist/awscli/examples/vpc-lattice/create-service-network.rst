**To create a service network**

The following ``create-service-network`` example creates a service network with the specified name. ::

    aws vpc-lattice create-service-network \
        --name my-service-network

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetwork/sn-080ec7dc93EXAMPLE",
        "authType": "NONE",
        "id": "sn-080ec7dc93EXAMPLE",
        "name": "my-service-network"
    }

For more information, see `Service networks <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-networks.html>`__ in the *Amazon VPC Lattice User Guide*.