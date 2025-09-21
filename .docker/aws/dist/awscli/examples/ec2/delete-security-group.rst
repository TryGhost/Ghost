**[EC2-Classic] To delete a security group**

This example deletes the security group named ``MySecurityGroup``. If the command succeeds, no output is returned.

Command::

  aws ec2 delete-security-group --group-name MySecurityGroup

**[EC2-VPC] To delete a security group**

This example deletes the security group with the ID ``sg-903004f8``. Note that you can't reference a security group for EC2-VPC by name. If the command succeeds, no output is returned.

Command::

  aws ec2 delete-security-group --group-id sg-903004f8

For more information, see `Using Security Groups`_ in the *AWS Command Line Interface User Guide*.

.. _`Using Security Groups`: http://docs.aws.amazon.com/cli/latest/userguide/cli-ec2-sg.html
