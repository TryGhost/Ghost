**To list the targets for a target group**

The following ``list-targets`` example lists the targets for the specified target group. ::

    aws vpc-lattice list-targets \
        --target-group-identifier tg-0eaa4b9ab4EXAMPLE

Output::

    {
        "items": [
            {
                "id": "i-07dd579bc5EXAMPLE",
                "port": 443,
                "status": "HEALTHY"
            },
            {
                "id": "i-047b3c9078EXAMPLE",
                "port": 443,
                "reasonCode": "HealthCheckFailed",
                "status": "UNHEALTHY"
            }
        ]
    }

For more information, see `Target groups <https://docs.aws.amazon.com/vpc-lattice/latest/ug/target-groups.html>`__ in the *Amazon VPC Lattice User Guide*.