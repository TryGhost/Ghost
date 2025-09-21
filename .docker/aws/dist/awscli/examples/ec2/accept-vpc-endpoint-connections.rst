**To accept an interface endpoint connection request**

This example accepts the specified endpoint connection request for the specified endpoint service.

Command::

  aws ec2 accept-vpc-endpoint-connections --service-id vpce-svc-03d5ebb7d9579a2b3 --vpc-endpoint-ids vpce-0c1308d7312217abc
  
Output::

  {
    "Unsuccessful": []
  }