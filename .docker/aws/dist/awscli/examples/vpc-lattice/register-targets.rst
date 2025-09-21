**To register a target**

The following ``register-targets`` example registers the specified targets with the specified target group. ::

    aws vpc-lattice register-targets \
        --targets id=i-047b3c9078EXAMPLE id=i-07dd579bc5EXAMPLE \
        --target-group-identifier tg-0eaa4b9ab4EXAMPLE 

Output::

    {
        "successful": [
            {
                "id": "i-07dd579bc5EXAMPLE",
                "port": 443
            }
        ],
        "unsuccessful": [
            {
                "failureCode": "UnsupportedTarget",
                "failureMessage": "Instance targets must be in the same VPC as their target group",
                "id": "i-047b3c9078EXAMPLE",
                "port": 443
            }
        ]
    }

For more information, see `Register targets <https://docs.aws.amazon.com/vpc-lattice/latest/ug/register-targets.html>`__ in the *Amazon VPC Lattice User Guide*.