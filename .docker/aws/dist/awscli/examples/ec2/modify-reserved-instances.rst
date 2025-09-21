**To modify Reserved Instances**

This example command moves a Reserved Instance to another Availability Zone in the same region.

Command::

  aws ec2 modify-reserved-instances --reserved-instances-ids b847fa93-e282-4f55-b59a-1342f5bd7c02 --target-configurations AvailabilityZone=us-west-1c,Platform=EC2-Classic,InstanceCount=10

Output::

  {
    "ReservedInstancesModificationId": "rimod-d3ed4335-b1d3-4de6-ab31-0f13aaf46687"
  }


**To modify the network platform of Reserved Instances**

This example command converts EC2-Classic Reserved Instances to EC2-VPC.

Command::

  aws ec2 modify-reserved-instances --reserved-instances-ids f127bd27-edb7-44c9-a0eb-0d7e09259af0 --target-configurations AvailabilityZone=us-west-1c,Platform=EC2-VPC,InstanceCount=5

Output::

  {
    "ReservedInstancesModificationId": "rimod-82fa9020-668f-4fb6-945d-61537009d291"
  }

For more information, see `Modifying Your Reserved Instances`_ in the *Amazon EC2 User Guide*.

**To modify the instance size of Reserved Instances**

This example command modifies a Reserved Instance that has 10 m1.small Linux/UNIX instances in us-west-1c so that 8
m1.small instances become 2 m1.large instances, and the remaining 2 m1.small become 1 m1.medium instance in the same
Availability Zone.  Command::

  aws ec2 modify-reserved-instances --reserved-instances-ids 1ba8e2e3-3556-4264-949e-63ee671405a9 --target-configurations AvailabilityZone=us-west-1c,Platform=EC2-Classic,InstanceCount=2,InstanceType=m1.large AvailabilityZone=us-west-1c,Platform=EC2-Classic,InstanceCount=1,InstanceType=m1.medium

Output::

  {
      "ReservedInstancesModificationId": "rimod-acc5f240-080d-4717-b3e3-1c6b11fa00b6"
  }

For more information, see `Modifying the Instance Size of Your Reservations`_ in the *Amazon EC2 User Guide*.

.. _`Modifying the Instance Size of Your Reservations`: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-modification-instancemove.html
.. _`Modifying Your Reserved Instances`: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-modifying.html

