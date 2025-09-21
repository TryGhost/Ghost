**To detach an internet gateway from your VPC**

The following ``detach-internet-gateway`` example detaches the specified internet gateway from the specific VPC. ::

    aws ec2 detach-internet-gateway \
        --internet-gateway-id igw-0d0fb496b3EXAMPLE \
        --vpc-id vpc-0a60eb65b4EXAMPLE

This command produces no output.

For more information, see `Internet gateways <https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html>`__ in the *Amazon VPC User Guide*.