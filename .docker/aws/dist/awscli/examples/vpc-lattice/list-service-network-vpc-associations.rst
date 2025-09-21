**To list VPC associations**

The following ``list-service-network-vpc-associations`` example lists the VPC associations for the specified service network. The ``--query`` option scopes the output to the IDs of the VPC associations. ::

    aws vpc-lattice list-service-network-vpc-associations \
        --service-network-identifier sn-080ec7dc93EXAMPLE \
        --query items[*].id

Output::

    [
        "snva-0821fc8631EXAMPLE",
        "snva-0c5dcb60d6EXAMPLE"
    ]

For more information, see `Manage VPC associations <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-network-associations.html#service-network-vpc-associations>`__ in the *Amazon VPC Lattice User Guide*.