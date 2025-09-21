**To attach an internet gateway to your VPC**

The following ``attach-internet-gateway`` example attaches the specified internet gateway to the specific VPC. ::

    aws ec2 attach-internet-gateway \
        --internet-gateway-id igw-0d0fb496b3EXAMPLE \
        --vpc-id vpc-0a60eb65b4EXAMPLE

This command produces no output. 

For more information, see `Internet gateways <https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html>`__ in the *Amazon VPC User Guide*.