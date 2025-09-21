**To get information about a VPC association**

The following ``get-service-network-vpc-association`` example gets information about the specified VPC association. ::

    aws vpc-lattice get-service-network-vpc-association \
        --service-network-vpc-association-identifier snva-0821fc8631EXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetworkvpcassociation/snva-0821fc8631EXAMPLE",
        "createdAt": "2023-06-06T23:41:08.421Z",
        "createdBy": "123456789012",
        "id": "snva-0c5dcb60d6EXAMPLE",
        "lastUpdatedAt": "2023-06-06T23:41:08.421Z",
        "securityGroupIds": [
            "sg-0aee16bc6cEXAMPLE"
        ],
        "serviceNetworkArn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetwork/sn-080ec7dc93EXAMPLE",
        "serviceNetworkId": "sn-080ec7dc93EXAMPLE",
        "serviceNetworkName": "my-service-network",
        "status": "ACTIVE",
        "vpcId": "vpc-0a1b2c3d4eEXAMPLE"
    }

For more information, see `Manage VPC associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-vpc-associations>`__ in the *Amazon VPC Lattice User Guide*.