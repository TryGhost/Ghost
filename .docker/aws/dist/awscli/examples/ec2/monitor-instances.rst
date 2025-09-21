**To enable detailed monitoring for an instance**

This example command enables detailed monitoring for the specified instance.

Command::

  aws ec2 monitor-instances --instance-ids i-1234567890abcdef0

Output::

  {
    "InstanceMonitorings": [
        {
            "InstanceId": "i-1234567890abcdef0",
            "Monitoring": {
                "State": "pending"
            }
        }
    ]
  }
