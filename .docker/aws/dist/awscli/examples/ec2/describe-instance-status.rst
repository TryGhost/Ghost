**To describe the status of an instance**

The following ``describe-instance-status`` example describes the current status of the specified instance. ::

    aws ec2 describe-instance-status \
        --instance-ids i-1234567890abcdef0

Output::

    {
        "InstanceStatuses": [
            {
                "InstanceId": "i-1234567890abcdef0",
                "InstanceState": {
                    "Code": 16,
                    "Name": "running"
                },
                "AvailabilityZone": "us-east-1d",
                "SystemStatus": {
                    "Status": "ok",
                    "Details": [
                        {
                            "Status": "passed",
                            "Name": "reachability"
                        }
                    ]
                },
                "InstanceStatus": {
                    "Status": "ok",
                    "Details": [
                        {
                            "Status": "passed",
                            "Name": "reachability"
                        }
                    ]
                }
            }
        ]
    }

For more information, see `Monitor the status of your instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instances-status-check.html>`__ in the *Amazon EC2 User Guide*.
