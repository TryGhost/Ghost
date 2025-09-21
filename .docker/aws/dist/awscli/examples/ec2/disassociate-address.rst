**To disassociate an Elastic IP addresses in EC2-Classic**

This example disassociates an Elastic IP address from an instance in EC2-Classic. If the command succeeds, no output is returned.

Command::

  aws ec2 disassociate-address --public-ip 198.51.100.0

**To disassociate an Elastic IP address in EC2-VPC**

This example disassociates an Elastic IP address from an instance in a VPC. If the command succeeds, no output is returned.

Command::

  aws ec2 disassociate-address --association-id eipassoc-2bebb745
