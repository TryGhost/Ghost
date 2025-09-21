**To list endpoint groups**

The following ``list-endpoint-groups`` example lists the endpoint groups for a listener. This listener has two endpoint groups. ::

    aws globalaccelerator --region us-west-2 list-endpoint-groups \
        --listener-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/abcdef1234

Output::

    {
        "EndpointGroups": [
            {
                "EndpointGroupArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/abcdef1234/endpoint-group/ab88888example",
                "EndpointGroupRegion": "eu-central-1",
                "EndpointDescriptions": [],
                "TrafficDialPercentage": 100.0,
                "HealthCheckPort": 80,
                "HealthCheckProtocol": "TCP",
                "HealthCheckIntervalSeconds": 30,
                "ThresholdCount": 3
            }
            {
                "EndpointGroupArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/abcdef1234/endpoint-group/ab99999example",
                "EndpointGroupRegion": "us-east-1",
                "EndpointDescriptions": [],
                "TrafficDialPercentage": 50.0,
                "HealthCheckPort": 80,
                "HealthCheckProtocol": "TCP",
                "HealthCheckIntervalSeconds": 30,
                "ThresholdCount": 3
            }
        ]
    }

For more information, see `Endpoint Groups in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups.html>`__ in the *AWS Global Accelerator Developer Guide*.