**To list service associations**

The following ``list-service-network-service-associations`` example lists the service associations for the specified service network. The ``--query`` option scopes the output to the IDs of the service associations. ::

    aws vpc-lattice list-service-network-service-associations \ 
        --service-network-identifier sn-080ec7dc93EXAMPLE \
        --query items[*].id

Output::

    [
        "snsa-031fabb4d8EXAMPLE",
        "snsa-0e16955a8cEXAMPLE"
    ]

For more information, see `Manage service associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-service-associations>`__ in the *Amazon VPC Lattice User Guide*.