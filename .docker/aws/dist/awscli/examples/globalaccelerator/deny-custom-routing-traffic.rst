**To specify a destination address that cannot receive traffic in a custom routing accelerator**

The following ``deny-custom-routing-traffic`` example specifies destination address or addresses in a subnet endpoint that cannot receive traffic for a custom routing accelerator. To specify more than one destination address, separate the addresses with a space. There's no response for a successful deny-custom-routing-traffic call. ::

    aws globalaccelerator deny-custom-routing-traffic \
        --endpoint-group-arn "arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/ab88888example" \
        --endpoint-id "subnet-abcd123example" \
        --destination-addresses "198.51.100.52"

This command produces no output.

For more information, see `VPC subnet endpoints for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-endpoints.html>`__ in the *AWS Global Accelerator Developer Guide*.