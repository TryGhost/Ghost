**To deregister a target**

The following ``deregister-targets`` example deregisters the specified target from the specified target group. ::

    aws vpc-lattice deregister-targets \
        --targets i-07dd579bc5EXAMPLE \
        --target-group-identifier tg-0eaa4b9ab4EXAMPLE

Output::

    {
        "successful": [
            {
                "id": "i-07dd579bc5EXAMPLE",
                "port": 443
            }
        ],
        "unsuccessful": []
    }

For more information, see `Register targets <https://docs.aws.amazon.com/vpc-lattice/latest/ug/register-targets.html>`__ in the *Amazon VPC Lattice User Guide*.