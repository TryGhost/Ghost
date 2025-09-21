**Example 1: To describe an instance type**

The following ``describe-instance-types`` example displays details for the specified instance type. ::

    aws ec2 describe-instance-types \
        --instance-types t2.micro

Output::

    {
        "InstanceTypes": [
            {
                "InstanceType": "t2.micro",
                "CurrentGeneration": true,
                "FreeTierEligible": true,
                "SupportedUsageClasses": [
                    "on-demand",
                    "spot"
                ],
                "SupportedRootDeviceTypes": [
                    "ebs"
                ],
                "BareMetal": false,
                "Hypervisor": "xen",
                "ProcessorInfo": {
                    "SupportedArchitectures": [
                        "i386",
                        "x86_64"
                    ],
                    "SustainedClockSpeedInGhz": 2.5
                },
                "VCpuInfo": {
                    "DefaultVCpus": 1,
                    "DefaultCores": 1,
                    "DefaultThreadsPerCore": 1,
                    "ValidCores": [
                        1
                    ],
                    "ValidThreadsPerCore": [
                        1
                    ]
                },
                "MemoryInfo": {
                    "SizeInMiB": 1024
                },
                "InstanceStorageSupported": false,
                "EbsInfo": {
                    "EbsOptimizedSupport": "unsupported",
                    "EncryptionSupport": "supported"
                },
                "NetworkInfo": {
                    "NetworkPerformance": "Low to Moderate",
                    "MaximumNetworkInterfaces": 2,
                    "Ipv4AddressesPerInterface": 2,
                    "Ipv6AddressesPerInterface": 2,
                    "Ipv6Supported": true,
                    "EnaSupport": "unsupported"
                },
                "PlacementGroupInfo": {
                    "SupportedStrategies": [
                        "partition",
                        "spread"
                    ]
                },
                "HibernationSupported": false,
                "BurstablePerformanceSupported": true,
                "DedicatedHostsSupported": false,
                "AutoRecoverySupported": true
            }
        ]
    }

For more information, see `Instance Types <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html>`__ in *Amazon Elastic Compute Cloud
User Guide for Linux Instances*.

**Example 2: To filter the available instance types**

You can specify a filter to scope the results to instance types that have a specific characteristic. The following ``describe-instance-types`` example lists the instance types that support hibernation. ::

    aws ec2 describe-instance-types \
        --filters Name=hibernation-supported,Values=true --query 'InstanceTypes[*].InstanceType'

Output::

    [
        "m5.8xlarge",
        "r3.large",
        "c3.8xlarge",
        "r5.large",
        "m4.4xlarge",
        "c4.large",
        "m5.xlarge",
        "m4.xlarge",
        "c3.large",
        "c4.8xlarge",
        "c4.4xlarge",
        "c5.xlarge",
        "c5.12xlarge",
        "r5.4xlarge",
        "c5.4xlarge"
    ]

For more information, see `Instance Types <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html>`__ in *Amazon Elastic Compute Cloud
User Guide for Linux Instances*.