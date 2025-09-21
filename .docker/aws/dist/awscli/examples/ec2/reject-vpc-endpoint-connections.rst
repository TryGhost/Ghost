**To reject an interface endpoint connection request**

This example rejects the specified endpoint connection request for the specified endpoint service.

Command::

  aws ec2 reject-vpc-endpoint-connections --service-id vpce-svc-03d5ebb7d9579a2b3 --vpc-endpoint-ids vpce-0c1308d7312217abc
  
Output::

  {
    "Unsuccessful": []
  }