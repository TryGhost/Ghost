**To replace the route table associated with a subnet**

This example associates the specified route table with the subnet for the specified route table association.

Command::

  aws ec2 replace-route-table-association --association-id rtbassoc-781d0d1a --route-table-id rtb-22574640

Output::

  {
      "NewAssociationId": "rtbassoc-3a1f0f58"
  }