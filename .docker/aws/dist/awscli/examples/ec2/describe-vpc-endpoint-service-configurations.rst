**To describe endpoint service configurations**

The following ``describe-vpc-endpoint-service-configurations`` example describes your endpoint service configurations. ::

    aws ec2 describe-vpc-endpoint-service-configurations

Output::

    {
        "ServiceConfigurations": [
            {
                "ServiceType": [
                    {
                        "ServiceType": "GatewayLoadBalancer"
                    }
                ],
                "ServiceId": "vpce-svc-012d33a1c4321cabc",
                "ServiceName": "com.amazonaws.vpce.us-east-1.vpce-svc-012d33a1c4321cabc",
                "ServiceState": "Available",
                "AvailabilityZones": [
                    "us-east-1d"
                ],
                "AcceptanceRequired": false,
                "ManagesVpcEndpoints": false,
                "GatewayLoadBalancerArns": [
                    "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/gwy/GWLBService/123210844e429123"
                ],
                "Tags": []
            },
            {
                "ServiceType": [
                    {
                        "ServiceType": "Interface"
                    }
                ],
                "ServiceId": "vpce-svc-123cabc125efa123",
                "ServiceName": "com.amazonaws.vpce.us-east-1.vpce-svc-123cabc125efa123",
                "ServiceState": "Available",
                "AvailabilityZones": [
                    "us-east-1a"
                ],
                "AcceptanceRequired": true,
                "ManagesVpcEndpoints": false,
                "NetworkLoadBalancerArns": [
                    "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/NLBforService/1238753950b25123"
                ],
                "BaseEndpointDnsNames": [
                    "vpce-svc-123cabc125efa123.us-east-1.vpce.amazonaws.com"
                ],
                "PrivateDnsName": "example.com",
                "PrivateDnsNameConfiguration": {
                    "State": "failed",
                    "Type": "TXT",
                    "Value": "vpce:qUAth3FdeABCApUiXabc",
                    "Name": "_1d367jvbg34znqvyefrj"
                },
                "Tags": []
            }
        ]
    }

For more information, see `Concepts <https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html>`__ in the *AWS PrivateLink User Guide*.
