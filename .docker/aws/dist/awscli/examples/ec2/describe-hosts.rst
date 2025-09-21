**To view details about Dedicated Hosts**

The following ``describe-hosts`` example displays details for the ``available`` Dedicated Hosts in your AWS account. ::

    aws ec2 describe-hosts --filter "Name=state,Values=available"

Output::

    {
        "Hosts": [
            {
                "HostId": "h-07879acf49EXAMPLE",
                "Tags": [
                    {
                        "Value": "production",
                        "Key": "purpose"
                    }
                ],
                "HostProperties": {
                    "Cores": 48,
                    "TotalVCpus": 96,
                    "InstanceType": "m5.large",
                    "Sockets": 2
                },
                "Instances": [],
                "State": "available",
                "AvailabilityZone": "eu-west-1a",
                "AvailableCapacity": {
                    "AvailableInstanceCapacity": [
                        {
                            "AvailableCapacity": 48,
                            "InstanceType": "m5.large",
                            "TotalCapacity": 48
                        }
                    ],
                    "AvailableVCpus": 96
                },
                "HostRecovery": "on",
                "AllocationTime": "2019-08-19T08:57:44.000Z",
                "AutoPlacement": "off"
            }
        ]
    }

For more information, see `Viewing Dedicated Hosts <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-dedicated-hosts-work.html#dedicated-hosts-managing>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.
