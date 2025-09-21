**To allow traffic to specific Amazon EC2 instance destinations in a VPC subnet for a custom routing accelerator**

The following ``allow-custom-routing-traffic`` example specifies that traffic is allowed to certain Amazon EC2 instance (destination) IP addresses and ports for a VPC subnet endpoint in a custom routing accelerator can receive traffic. ::

    aws globalaccelerator allow-custom-routing-traffic \
        --endpoint-group-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh/listener/0123vxyz/endpoint-group/ab88888example \
        --endpoint-id subnet-abcd123example \
        --destination-addresses "172.31.200.6" "172.31.200.7" \
        --destination-ports 80 81

This command produces no output.

For more information, see `VPC subnet endpoints for custom routing accelerators in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-endpoints.html>`__ in the *AWS Global Accelerator Developer Guide*.