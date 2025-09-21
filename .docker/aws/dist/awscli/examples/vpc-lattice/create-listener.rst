**To create a listener**

The following ``create-listener`` example creates an HTTPS listener with a default rule that forwards traffic to the specified VPC Lattice target group. ::

    aws vpc-lattice create-listener \
        --name my-service-listener \
        --protocol HTTPS \
        --port 443 \
        --service-identifier svc-0285b53b2eEXAMPLE \
        --default-action file://listener-config.json

Contents of ``listener-config.json``::

    {
        "forward": {
            "targetGroups": [
                {
                    "targetGroupIdentifier": "tg-0eaa4b9ab4EXAMPLE"
                }
            ]
        }
    }

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE/listener/listener-07cc7fb0abEXAMPLE",
        "defaultAction": {
            "forward": {
                "targetGroups": [
                    {
                        "targetGroupIdentifier": "tg-0eaa4b9ab4EXAMPLE",
                        "weight": 100
                    }
                ]
            }
        },
        "id": "listener-07cc7fb0abEXAMPLE",
        "name": "my-service-listener",
        "port": 443,
        "protocol": "HTTPS",
        "serviceArn": "arn:aws:vpc-lattice:us-east-2:123456789012:service/svc-0285b53b2eEXAMPLE",
        "serviceId": "svc-0285b53b2eEXAMPLE"
    }

For more information, see `Listeners <https://docs.aws.amazon.com/vpc-lattice/latest/ug/listeners.html>`__ in the *Amazon VPC Lattice User Guide*.