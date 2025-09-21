**To list your service networks**

The following ``list-service-networks`` example lists the service networks owned or shared with the calling account. The ``--query`` option scopes the results to the Amazon Resource Names (ARN) of the service networks. ::

    aws vpc-lattice list-service-networks \
        --query items[*].arn

Output::

    [
        "arn:aws:vpc-lattice:us-east-2:123456789012:servicenetwork/sn-080ec7dc93EXAMPLE",
        "arn:aws:vpc-lattice:us-east-2:111122223333:servicenetwork/sn-0ec4d436cfEXAMPLE"
    ]

For more information, see `Service networks <https://docs.aws.amazon.com/vpc-lattice/latest/ug/service-networks.html>`__ in the *Amazon VPC Lattice User Guide*.