**To perform a Convertible Reserved Instance exchange**

This example performs an exchange of the specified Convertible Reserved Instances.

Command::

  aws ec2 accept-reserved-instances-exchange-quote --reserved-instance-ids 7b8750c3-397e-4da4-bbcb-a45ebexample --target-configurations OfferingId=b747b472-423c-48f3-8cee-679bcexample

Output::

  {
    "ExchangeId": "riex-e68ed3c1-8bc8-4c17-af77-811afexample"
  }