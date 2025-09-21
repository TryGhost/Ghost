**To describe the credit option for CPU usage of one or more instances**

The following ``describe-instance-credit-specifications`` example describes the CPU credit option for the specified instance. ::

    aws ec2 describe-instance-credit-specifications \
        --instance-ids i-1234567890abcdef0

Output::

    {
        "InstanceCreditSpecifications": [
            {
                "InstanceId": "i-1234567890abcdef0",
                "CpuCredits": "unlimited"
            }
        ]
    }

For more information, see `Work with burstable performance instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-how-to.html>`__ in the *Amazon EC2 User Guide*.