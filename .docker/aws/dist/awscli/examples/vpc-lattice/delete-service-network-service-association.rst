**To delete a service association**

The following ``delete-service-network-service-association`` example disassociates the specified service association. ::

    aws vpc-lattice delete-service-network-service-association \
        --service-network-service-association-identifier snsa-031fabb4d8EXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetworkserviceassociation/snsa-031fabb4d8EXAMPLE",
        "id": "snsa-031fabb4d8EXAMPLE",
        "status": "DELETE_IN_PROGRESS"
    }

For more information, see `Manage service associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-service-associations>`__ in the *Amazon VPC Lattice User Guide*.