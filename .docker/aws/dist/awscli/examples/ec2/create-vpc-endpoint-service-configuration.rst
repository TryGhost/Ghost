**Example 1: To create an endpoint service configuration for an interface endpoint**

The following ``create-vpc-endpoint-service-configuration`` example creates a VPC endpoint service configuration using the Network Load Balancer ``nlb-vpce``. This example also specifies that requests to connect to the service through an interface endpoint must be accepted. ::

    aws ec2 create-vpc-endpoint-service-configuration \
        --network-load-balancer-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/nlb-vpce/e94221227f1ba532 \
        --acceptance-required

Output::

    {
       "ServiceConfiguration": {
           "ServiceType": [
               {
                   "ServiceType": "Interface"
               }
           ],
           "NetworkLoadBalancerArns": [
               "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/nlb-vpce/e94221227f1ba532"
           ],
           "ServiceName": "com.amazonaws.vpce.us-east-1.vpce-svc-03d5ebb7d9579a2b3",
           "ServiceState": "Available",
           "ServiceId": "vpce-svc-03d5ebb7d9579a2b3",
           "AcceptanceRequired": true,
           "AvailabilityZones": [
               "us-east-1d"
           ],
           "BaseEndpointDnsNames": [
               "vpce-svc-03d5ebb7d9579a2b3.us-east-1.vpce.amazonaws.com"
           ]
       }
    }

For more information, see `Create an endpoint service <https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html>`__ in the *AWS PrivateLink User Guide*.

**Example 2: To create an endpoint service configuration for a Gateway Load Balancer endpoint**

The following ``create-vpc-endpoint-service-configuration`` example creates a VPC endpoint service configuration using the Gateway Load Balancer ``GWLBService``. Requests to connect to the service through a Gateway Load Balancer endpoint are automatically accepted. ::

    aws ec2 create-vpc-endpoint-service-configuration \
        --gateway-load-balancer-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/gwy/GWLBService/123123123123abcc \
        --no-acceptance-required

Output::

    {
        "ServiceConfiguration": {
            "ServiceType": [
                {
                    "ServiceType": "GatewayLoadBalancer"
                }
            ],
            "ServiceId": "vpce-svc-123123a1c43abc123",
            "ServiceName": "com.amazonaws.vpce.us-east-1.vpce-svc-123123a1c43abc123",
            "ServiceState": "Available",
            "AvailabilityZones": [
                "us-east-1d"
            ],
            "AcceptanceRequired": false,
            "ManagesVpcEndpoints": false,
            "GatewayLoadBalancerArns": [
                "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/gwy/GWLBService/123123123123abcc"
            ]
        }
    }

For more information, see `Create a Gateway Load Balancer endpoint service <https://docs.aws.amazon.com/vpc/latest/privatelink/create-gateway-load-balancer-endpoint-service.html>`__ in the *AWS PrivateLink User Guide*.