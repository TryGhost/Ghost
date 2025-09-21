**To delete a VPC association**

The following ``delete-service-network-vpc-association`` example disassociates the specified VPC association. ::

    aws vpc-lattice delete-service-network-vpc-association \
        --service-network-vpc-association-identifier snva-0821fc8631EXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetworkvpcassociation/snva-0821fc8631EXAMPLE",
        "id": "snva-0821fc8631EXAMPLE",
        "status": "DELETE_IN_PROGRESS"
    }

For more information, see `Manage VPC associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-vpc-associations>`__ in the *Amazon VPC Lattice User Guide*.