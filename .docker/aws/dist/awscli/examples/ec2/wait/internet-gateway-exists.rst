**To wait until an internet gateway exists**

The following ``wait internet-gateway-exists`` example pauses and resumes running only after it confirms that the specified internet gateway exists. ::

    aws ec2 wait internet-gateway-exists \
        --internet-gateway-ids igw-1234567890abcdef0

This command produces no output.

For more information, see `Internet gateways <https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html>`__ in the *Amazon VPC User Guide*.