**To get information about a service listener**

The following ``get-listener`` example gets information about the specified listener for the specified service. ::

    aws vpc-lattice get-listener \
        --listener-identifier listener-0ccf55918cEXAMPLE \
        --service-identifier svc-0285b53b2eEXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE/listener/listener-0ccf55918cEXAMPLE",
        "createdAt": "2023-05-07T05:08:45.192Z",
        "defaultAction": {
            "forward": {
                "targetGroups": [
                    {
                        "targetGroupIdentifier": "tg-0ff213abb6EXAMPLE",
                        "weight": 1
                    }
                ]
            }
        },
        "id": "listener-0ccf55918cEXAMPLE",
        "lastUpdatedAt": "2023-05-07T05:08:45.192Z",
        "name": "http-80",
        "port": 80,
        "protocol": "HTTP",
        "serviceArn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE",
        "serviceId": "svc-0285b53b2eEXAMPLE"
    }

For more information, see `Define routing <https://docs.aws.amazon.com/vpc-lattice/latest/ug/services.html#define-routing>`__ in the *Amazon VPC Lattice User Guide*.