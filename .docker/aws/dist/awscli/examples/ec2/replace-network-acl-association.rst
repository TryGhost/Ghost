**To replace the network ACL associated with a subnet**

This example associates the specified network ACL with the subnet for the specified network ACL association.

Command::

  aws ec2 replace-network-acl-association --association-id aclassoc-e5b95c8c --network-acl-id acl-5fb85d36

Output::

  {
      "NewAssociationId": "aclassoc-3999875b"
  }