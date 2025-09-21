**To create a VPC association**

The following ``create-service-network-vpc-association`` example associates the specified vpc with the specified service network. The specified security group controls which resources in the VPC can access the service network and its services. ::

    aws vpc-lattice create-service-network-vpc-association \
        --vpc-identifier vpc-0a1b2c3d4eEXAMPLE \
        --service-network-identifier sn-080ec7dc93EXAMPLE \
        --security-group-ids sg-0aee16bc6cEXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetworkvpcassociation/snva-0821fc8631EXAMPLE",
        "createdBy": "123456789012",
        "id": "snva-0821fc8631EXAMPLE",
        "securityGroupIds": [
            "sg-0aee16bc6cEXAMPLE"
        ],
        "status": "CREATE_IN_PROGRESS"
    }

For more information, see `Manage VPC associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-vpc-associations>`__ in the *Amazon VPC Lattice User Guide*.