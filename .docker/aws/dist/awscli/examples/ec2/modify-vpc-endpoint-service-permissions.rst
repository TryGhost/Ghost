**To modify endpoint service permissions**

This example adds permission for an AWS account to connect to the specified endpoint service.

Command::

  aws ec2 modify-vpc-endpoint-service-permissions --service-id vpce-svc-03d5ebb7d9579a2b3 --add-allowed-principals '["arn:aws:iam::123456789012:root"]'

Output::

 {
    "ReturnValue": true
 }

This example adds permission for a specific IAM user (``admin``) to connect to the specified endpoint service.

Command::

  aws ec2 modify-vpc-endpoint-service-permissions --service-id vpce-svc-03d5ebb7d9579a2b3 --add-allowed-principals '["arn:aws:iam::123456789012:user/admin"]'
