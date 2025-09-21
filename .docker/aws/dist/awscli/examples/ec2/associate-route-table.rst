**To associate a route table with a subnet**

This example associates the specified route table with the specified subnet.

Command::

  aws ec2 associate-route-table --route-table-id rtb-22574640 --subnet-id subnet-9d4a7b6c

Output::

  {
      "AssociationId": "rtbassoc-781d0d1a"
  }