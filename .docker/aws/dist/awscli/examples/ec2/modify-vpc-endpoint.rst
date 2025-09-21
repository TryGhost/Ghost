**To modify a gateway endpoint**

This example modifies gateway endpoint ``vpce-1a2b3c4d`` by associating route table ``rtb-aaa222bb`` with the endpoint, and resetting the policy document.

Command::

  aws ec2 modify-vpc-endpoint --vpc-endpoint-id vpce-1a2b3c4d --add-route-table-ids rtb-aaa222bb --reset-policy

Output::

  {
    "Return": true
  }

**To modify an interface endpoint**

This example modifies interface endpoint ``vpce-0fe5b17a0707d6fa5`` by adding subnet ``subnet-d6fcaa8d`` to the endpoint.

Command:: 

  aws ec2 modify-vpc-endpoint --vpc-endpoint-id vpce-0fe5b17a0707d6fa5 --add-subnet-id subnet-d6fcaa8d

Output::

  {
    "Return": true
  }