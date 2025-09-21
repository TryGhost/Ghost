**To get information about a service network**

The following ``get-service-network`` example gets information about the specified service network. ::

    aws vpc-lattice get-service-network \
        --service-network-identifier sn-080ec7dc93EXAMPLE

Output::

    {
       "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetwork/sn-080ec7dc93EXAMPLE",
       "authType": "AWS_IAM",
       "createdAt": "2023-05-05T15:26:08.417Z",
       "id": "sn-080ec7dc93EXAMPLE",
       "lastUpdatedAt": "2023-05-05T15:26:08.417Z",
       "name": "my-service-network",
       "numberOfAssociatedServices": 2,
       "numberOfAssociatedVPCs": 3
    }

For more information, see `Service networks <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-networks.html>`__ in the *Amazon VPC Lattice User Guide*.