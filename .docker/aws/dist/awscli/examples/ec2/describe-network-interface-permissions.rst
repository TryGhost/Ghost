**To describe your network interface permissions**

This example describes all of your network interface permissions.

Command::

  aws ec2 describe-network-interface-permissions

Output::

  {
    "NetworkInterfacePermissions": [
        {
            "PermissionState": {
                "State": "GRANTED"
            }, 
            "NetworkInterfacePermissionId": "eni-perm-06fd19020ede149ea", 
            "NetworkInterfaceId": "eni-b909511a", 
            "Permission": "INSTANCE-ATTACH", 
            "AwsAccountId": "123456789012"
        }
    ]
  }