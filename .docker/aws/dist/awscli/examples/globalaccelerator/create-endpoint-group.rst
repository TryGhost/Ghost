**To create an endpoint group**

The following ``create-endpoint-group`` example creates an endpoint group with one endpoint. ::

    aws globalaccelerator create-endpoint-group \
        --listener-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz \
        --endpoint-group-region us-east-1 \
        --endpoint-configurations EndpointId=i-1234567890abcdef0,Weight=128

Output::

    {
        "EndpointGroup": {
            "TrafficDialPercentage": 100.0, 
            "EndpointDescriptions": [
                {
                    "Weight": 128, 
                    "EndpointId": "i-1234567890abcdef0"
                }
            ], 
            "EndpointGroupArn": "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/098765zyxwvu", 
            "EndpointGroupRegion": "us-east-1"
        }
    }

For more information, see `Endpoint groups in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups.html>`__ in the *AWS Global Accelerator Developer Guide*.
