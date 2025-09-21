**To describe VPC endpoint connections**

This example describes the interface endpoint connections to your endpoint service and filters the results to display endpoints that are ``PendingAcceptance``.

Command::

  aws ec2 describe-vpc-endpoint-connections --filters Name=vpc-endpoint-state,Values=pendingAcceptance
  
Output::

  {
    "VpcEndpointConnections": [
        {
            "VpcEndpointId": "vpce-0abed31004e618123", 
            "ServiceId": "vpce-svc-0abced088d20def56", 
            "CreationTimestamp": "2017-11-30T10:00:24.350Z", 
            "VpcEndpointState": "pendingAcceptance", 
            "VpcEndpointOwner": "123456789012"
        }
    ]
  }