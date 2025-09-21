**To list service listeners**

The following ``list-listeners`` example lists the listeners for the specified service. ::

    aws vpc-lattice list-listeners \
        --service-identifier svc-0285b53b2eEXAMPLE

Output::

    {
        "items": [
            {
                "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE/listener/listener-0ccf55918cEXAMPLE",
                "createdAt": "2023-05-07T05:08:45.192Z",
                "id": "listener-0ccf55918cEXAMPLE",
                "lastUpdatedAt": "2023-05-07T05:08:45.192Z",
                "name": "http-80",
                "port": 80,
                "protocol": "HTTP"
            }
        ]
    }

For more information, see `Define routing <https://docs.aws.amazon.com/vpc-lattice/latest/ug/services.html#define-routing>`__ in the *Amazon VPC Lattice User Guide*.