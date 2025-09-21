**To modify an endpoint service configuration**

This example changes the acceptance requirement for the specified endpoint service.

Command::

  aws ec2 modify-vpc-endpoint-service-configuration --service-id vpce-svc-09222513e6e77dc86 --no-acceptance-required

Output::

 {
    "ReturnValue": true
 }