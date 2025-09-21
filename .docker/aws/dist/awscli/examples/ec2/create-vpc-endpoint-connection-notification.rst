**To create an endpoint connection notification**

This example creates a notification for a specific endpoint service that alerts you when interface endpoints have connected to your service and when endpoints have been accepted for your service.

Command::

  aws ec2 create-vpc-endpoint-connection-notification --connection-notification-arn arn:aws:sns:us-east-2:123456789012:VpceNotification --connection-events Connect Accept --service-id vpce-svc-1237881c0d25a3abc

Output::

 {
    "ConnectionNotification": {
        "ConnectionNotificationState": "Enabled", 
        "ConnectionNotificationType": "Topic", 
        "ServiceId": "vpce-svc-1237881c0d25a3abc", 
        "ConnectionEvents": [
            "Accept",
            "Connect"
        ], 
        "ConnectionNotificationId": "vpce-nfn-008776de7e03f5abc", 
        "ConnectionNotificationArn": "arn:aws:sns:us-east-2:123456789012:VpceNotification"
    }
  }
