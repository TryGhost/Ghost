**Example 1: To stop an Amazon EC2 instance**

The following ``stop-instances`` example stops the specified Amazon EBS-backed instance. ::

    aws ec2 stop-instances \
        --instance-ids i-1234567890abcdef0

Output::

    {
        "StoppingInstances": [
            {
                "InstanceId": "i-1234567890abcdef0",
                "CurrentState": {
                    "Code": 64,
                    "Name": "stopping"
                },
                "PreviousState": {
                    "Code": 16,
                    "Name": "running"
                }
            }
        ]
    }

For more information, see `Stop and Start Your Instance <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html>`__ in the *Amazon Elastic Compute Cloud User Guide*.

**Example 2: To hibernate an Amazon EC2 instance**

The following ``stop-instances`` example hibernates Amazon EBS-backed instance if the instance is enabled for hibernation and meets the hibernation prerequisites. 
After the instance is put into hibernation the instance is stopped. ::

    aws ec2 stop-instances \
        --instance-ids i-1234567890abcdef0 \
        --hibernate

Output::

    {
        "StoppingInstances": [
            {
                "CurrentState": {
                    "Code": 64,
                    "Name": "stopping"
                },
                "InstanceId": "i-1234567890abcdef0",
                "PreviousState": {
                    "Code": 16,
                    "Name": "running"
                }
            }
        ]
    }

For more information, see `Hibernate your On-Demand Linux instance <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Hibernate.html>`__ in the *Amazon Elastic Cloud Compute User Guide*.

