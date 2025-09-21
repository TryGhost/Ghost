**To list your target groups**

The following ``list-target-groups`` example lists the target groups with a target type of ``LAMBDA``. ::

    aws vpc-lattice list-target-groups \
        --target-group-type LAMBDA

Output::

    {
        "items": [
            {
                "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:targetgroup/tg-045c1b7d9dEXAMPLE",
                "createdAt": "2023-05-06T05:22:16.637Z",
                "id": "tg-045c1b7d9dEXAMPLE",
                "lastUpdatedAt": "2023-05-06T05:22:16.637Z",
                "name": "my-target-group-lam",
                "serviceArns": [
                    "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE"
                ],
                "status": "ACTIVE",
                "type": "LAMBDA"
            }
        ]
    }

For more information, see `Target groups <https://docs.aws.amazon.com/vpc-lattice/latest/ug/target-groups.html>`__ in the *Amazon VPC Lattice User Guide*.