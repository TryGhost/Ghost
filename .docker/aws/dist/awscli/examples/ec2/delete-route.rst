**To delete a route**

This example deletes the specified route from the specified route table. If the command succeeds, no output is returned.

Command::

  aws ec2 delete-route --route-table-id rtb-22574640 --destination-cidr-block 0.0.0.0/0
