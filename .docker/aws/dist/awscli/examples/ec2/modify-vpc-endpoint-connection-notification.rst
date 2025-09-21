**To modify an endpoint connection notification**

This example changes the SNS topic for the specified endpoint connection notification.

Command::

  aws ec2 modify-vpc-endpoint-connection-notification --connection-notification-id vpce-nfn-008776de7e03f5abc --connection-events Accept Reject --connection-notification-arn arn:aws:sns:us-east-2:123456789012:mytopic

Output::

 {
    "ReturnValue": true
 }