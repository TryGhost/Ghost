**To disable detailed monitoring for an instance**

This example command disables detailed monitoring for the specified instance.

Command::

  aws ec2 unmonitor-instances --instance-ids i-1234567890abcdef0

Output::

  {
    "InstanceMonitorings": [
        {
            "InstanceId": "i-1234567890abcdef0",
            "Monitoring": {
                "State": "disabling"
            }
        }
    ]
  }
