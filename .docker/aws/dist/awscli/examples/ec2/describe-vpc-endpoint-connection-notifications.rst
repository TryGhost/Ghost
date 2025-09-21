**To describe endpoint connection notifications**

The following ``describe-vpc-endpoint-connection-notifications`` example describes all of your endpoint connection notifications. ::

  aws ec2 describe-vpc-endpoint-connection-notifications

Output::

 {
    "ConnectionNotificationSet": [
        {
            "ConnectionNotificationState": "Enabled", 
            "ConnectionNotificationType": "Topic", 
            "ConnectionEvents": [
                "Accept", 
                "Reject", 
                "Delete", 
                "Connect"
            ], 
            "ConnectionNotificationId": "vpce-nfn-04bcb952bc8af7abc", 
            "ConnectionNotificationArn": "arn:aws:sns:us-east-1:123456789012:VpceNotification", 
            "VpcEndpointId": "vpce-0324151a02f327123"
        }
    ]
  }
