**To add a VPC subnet endpoint to an endpoint group for a custom routing accelerator**

The following ``add-custom-routing-endpoints`` example adds a VPC subnet endpoint to an endpoint group for a custom routing accelerator. ::

    aws globalaccelerator add-custom-routing-endpoints \
        --endpoint-group-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/4321abcd \
        --endpoint-configurations "EndpointId=subnet-1234567890abcdef0"

Output::

    {
        "EndpointDescriptions": [
            {
                "EndpointId": "subnet-1234567890abcdef0"
            }
        ],
        "EndpointGroupArn":"arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/4321abcd"
    }

For more information, see `VPC subnet endpoints for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-endpoints.html>`__ in the *AWS Global Accelerator Developer Guide*.