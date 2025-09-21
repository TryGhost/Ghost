**To update an endpoint group**

The following ``update-endpoint-group`` example adds three endpoints to an endpoint group: an Elastic IP address, an ALB, and an NLB. ::

    aws globalaccelerator update-endpoint-group \
        --endpoint-group-arn arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/6789vxyz-vxyz-6789-vxyz-6789lmnopqrs/endpoint-group/ab88888example \
        --endpoint-configurations \ 
            EndpointId=eipalloc-eip01234567890abc,Weight=128 \
            EndpointId=arn:aws:elasticloadbalancing:us-east-1:000123456789:loadbalancer/app/ALBTesting/alb01234567890xyz,Weight=128 \
            EndpointId=arn:aws:elasticloadbalancing:us-east-1:000123456789:loadbalancer/net/NLBTesting/alb01234567890qrs,Weight=128 

Output::

    {
        "EndpointGroup": {
            "TrafficDialPercentage": 100,
            "EndpointDescriptions": [
                {
                    "Weight": 128,
                    "EndpointId": "eip01234567890abc"
                },
                {
                    "Weight": 128,
                    "EndpointId": "arn:aws:elasticloadbalancing:us-east-1:000123456789:loadbalancer/app/ALBTesting/alb01234567890xyz"
                },
                {
                    "Weight": 128,
                    "EndpointId": "arn:aws:elasticloadbalancing:us-east-1:000123456789:loadbalancer/net/NLBTesting/alb01234567890qrs"
                }
            ],
            "EndpointGroupArn": "arn:aws:globalaccelerator::123456789012:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/6789vxyz-vxyz-6789-vxyz-6789lmnopqrs/endpoint-group/4321abcd-abcd-4321-abcd-4321abcdefg",
            "EndpointGroupRegion": "us-east-1"
        }
    }

For more information, see `Endpoint groups in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups.html>`__ in the *AWS Global Accelerator Developer Guide*.