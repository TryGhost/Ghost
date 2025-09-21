**Example 1: To describe an instance**

The following ``describe-instances`` example describes the specified instance. ::

    aws ec2 describe-instances \
        --instance-ids i-1234567890abcdef0

Output::

    {
        "Reservations": [
            {
                "Groups": [],
                "Instances": [
                    {
                        "AmiLaunchIndex": 0,
                        "ImageId": "ami-0abcdef1234567890",
                        "InstanceId": "i-1234567890abcdef0",
                        "InstanceType": "t3.nano",
                        "KeyName": "my-key-pair",
                        "LaunchTime": "2022-11-15T10:48:59+00:00",
                        "Monitoring": {
                            "State": "disabled"
                        },
                        "Placement": {
                            "AvailabilityZone": "us-east-2a",
                            "GroupName": "",
                            "Tenancy": "default"
                        },
                        "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                        "PrivateIpAddress": "10-0-0-157",
                        "ProductCodes": [],
                        "PublicDnsName": "ec2-34-253-223-13.us-east-2.compute.amazonaws.com",
                        "PublicIpAddress": "34.253.223.13",
                        "State": {
                            "Code": 16,
                            "Name": "running"
                        },
                        "StateTransitionReason": "",
                        "SubnetId": "subnet-04a636d18e83cfacb",
                        "VpcId": "vpc-1234567890abcdef0",
                        "Architecture": "x86_64",
                        "BlockDeviceMappings": [
                            {
                                "DeviceName": "/dev/xvda",
                                "Ebs": {
                                    "AttachTime": "2022-11-15T10:49:00+00:00",
                                    "DeleteOnTermination": true,
                                    "Status": "attached",
                                    "VolumeId": "vol-02e6ccdca7de29cf2"
                                }
                            }
                        ],
                        "ClientToken": "1234abcd-1234-abcd-1234-d46a8903e9bc",
                        "EbsOptimized": true,
                        "EnaSupport": true,
                        "Hypervisor": "xen",
                        "IamInstanceProfile": {
                            "Arn": "arn:aws:iam::111111111111:instance-profile/AmazonSSMRoleForInstancesQuickSetup",
                            "Id": "111111111111111111111"
                        },
                        "NetworkInterfaces": [
                            {
                                "Association": {
                                    "IpOwnerId": "amazon",
                                    "PublicDnsName": "ec2-34-253-223-13.us-east-2.compute.amazonaws.com",
                                    "PublicIp": "34.253.223.13"
                                },
                                "Attachment": {
                                    "AttachTime": "2022-11-15T10:48:59+00:00",
                                    "AttachmentId": "eni-attach-1234567890abcdefg",
                                    "DeleteOnTermination": true,
                                    "DeviceIndex": 0,
                                    "Status": "attached",
                                    "NetworkCardIndex": 0
                                },
                                "Description": "",
                                "Groups": [
                                    {
                                        "GroupName": "launch-wizard-146",
                                        "GroupId": "sg-1234567890abcdefg"
                                    }
                                ],
                                "Ipv6Addresses": [],
                                "MacAddress": "00:11:22:33:44:55",
                                "NetworkInterfaceId": "eni-1234567890abcdefg",
                                "OwnerId": "104024344472",
                                "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                "PrivateIpAddress": "10-0-0-157",
                                "PrivateIpAddresses": [
                                    {
                                        "Association": {
                                            "IpOwnerId": "amazon",
                                            "PublicDnsName": "ec2-34-253-223-13.us-east-2.compute.amazonaws.com",
                                            "PublicIp": "34.253.223.13"
                                        },
                                        "Primary": true,
                                        "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                        "PrivateIpAddress": "10-0-0-157"
                                    }
                                ],
                                "SourceDestCheck": true,
                                "Status": "in-use",
                                "SubnetId": "subnet-1234567890abcdefg",
                                "VpcId": "vpc-1234567890abcdefg",
                                "InterfaceType": "interface"
                            }
                        ],
                        "RootDeviceName": "/dev/xvda",
                        "RootDeviceType": "ebs",
                        "SecurityGroups": [
                            {
                                "GroupName": "launch-wizard-146",
                                "GroupId": "sg-1234567890abcdefg"
                            }
                        ],
                        "SourceDestCheck": true,
                        "Tags": [
                            {
                                "Key": "Name",
                                "Value": "my-instance"
                            }
                        ],
                        "VirtualizationType": "hvm",
                        "CpuOptions": {
                            "CoreCount": 1,
                            "ThreadsPerCore": 2
                        },
                        "CapacityReservationSpecification": {
                            "CapacityReservationPreference": "open"
                        },
                        "HibernationOptions": {
                            "Configured": false
                        },
                        "MetadataOptions": {
                            "State": "applied",
                            "HttpTokens": "optional",
                            "HttpPutResponseHopLimit": 1,
                            "HttpEndpoint": "enabled",
                            "HttpProtocolIpv6": "disabled",
                            "InstanceMetadataTags": "enabled"
                        },
                        "EnclaveOptions": {
                            "Enabled": false
                        },
                        "PlatformDetails": "Linux/UNIX",
                        "UsageOperation": "RunInstances",
                        "UsageOperationUpdateTime": "2022-11-15T10:48:59+00:00",
                        "PrivateDnsNameOptions": {
                            "HostnameType": "ip-name",
                            "EnableResourceNameDnsARecord": true,
                            "EnableResourceNameDnsAAAARecord": false
                        },
                        "MaintenanceOptions": {
                            "AutoRecovery": "default"
                        }
                    }
                ],
                "OwnerId": "111111111111",
                "ReservationId": "r-1234567890abcdefg"
            }
        ]
    }

**Example 2: To filter for instances with the specified type**

The following ``describe-instances`` example uses filters to scope the results to instances of the specified type. ::

    aws ec2 describe-instances \
        --filters Name=instance-type,Values=m5.large

For example output, see Example 1.

For more information, see `List and filter using the CLI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Filtering.html#Filtering_Resources_CLI>`__ in the *Amazon EC2 User Guide*.

**Example 3: To filter for instances with the specified type and Availability Zone**

The following ``describe-instances`` example uses multiple filters to scope the results to instances with the specified type that are also in the specified Availability Zone. ::

    aws ec2 describe-instances \
        --filters Name=instance-type,Values=t2.micro,t3.micro Name=availability-zone,Values=us-east-2c

For example output, see Example 1.

**Example 4: To filter for instances with the specified type and Availability Zone using a JSON file**

The following ``describe-instances`` example uses a JSON input file to perform the same filtering as the previous example. When filters get more complicated, they can be easier to specify in a JSON file. ::

    aws ec2 describe-instances \
        --filters file://filters.json

Contents of ``filters.json``::

    [
        {
            "Name": "instance-type",
            "Values": ["t2.micro", "t3.micro"]
        },
        {
            "Name": "availability-zone",
            "Values": ["us-east-2c"]
        }
    ]

For example output, see Example 1.

**Example 5: To filter for instances with the specified Owner tag**

The following ``describe-instances`` example uses tag filters to scope the results to instances that have a tag with the specified tag key (Owner), regardless of the tag value. ::

    aws ec2 describe-instances \
        --filters "Name=tag-key,Values=Owner"

For example output, see Example 1.

**Example 6: To filter for instances with the specified my-team tag value**

The following ``describe-instances`` example uses tag filters to scope the results to instances that have a tag with the specified tag value (my-team), regardless of the tag key. ::

    aws ec2 describe-instances \
        --filters "Name=tag-value,Values=my-team"

For example output, see Example 1.

**Example 7: To filter for instances with the specified Owner tag and my-team value**

The following ``describe-instances`` example uses tag filters to scope the results to instances that have the specified tag (Owner=my-team). ::

    aws ec2 describe-instances \
        --filters "Name=tag:Owner,Values=my-team"

For example output, see Example 1.

**Example 8: To display only instance and subnet IDs for all instances**

The following ``describe-instances`` examples use the ``--query`` parameter to display only the instance and subnet IDs for all instances, in JSON format.

Linux and macOS::

    aws ec2 describe-instances \
        --query 'Reservations[*].Instances[*].{Instance:InstanceId,Subnet:SubnetId}' \
        --output json

Windows::

    aws ec2 describe-instances ^
        --query "Reservations[*].Instances[*].{Instance:InstanceId,Subnet:SubnetId}" ^
        --output json

Output::

    [
        {
            "Instance": "i-057750d42936e468a",
            "Subnet": "subnet-069beee9b12030077"
        },
        {
            "Instance": "i-001efd250faaa6ffa",
            "Subnet": "subnet-0b715c6b7db68927a"
        },
        {
            "Instance": "i-027552a73f021f3bd",
            "Subnet": "subnet-0250c25a1f4e15235"
        }
        ...
    ]

**Example 9: To filter instances of the specified type and only display their instance IDs**

The following ``describe-instances`` example uses filters to scope the results to instances of the specified type and the ``--query`` parameter to display only the instance IDs. ::

    aws ec2 describe-instances \
        --filters "Name=instance-type,Values=t2.micro" \
        --query "Reservations[*].Instances[*].[InstanceId]" \
        --output text

Output::

    i-031c0dc19de2fb70c
    i-00d8bff789a736b75
    i-0b715c6b7db68927a
    i-0626d4edd54f1286d
    i-00b8ae04f9f99908e
    i-0fc71c25d2374130c

**Example 10: To filter instances of the specified type and only display their instance IDs, Availability Zone, and the specified tag value**

The following ``describe-instances`` examples display the instance ID, Availability Zone, and the value of the ``Name`` tag for instances that have a tag with the name ``tag-key``, in table format.

Linux and macOS::

    aws ec2 describe-instances \
        --filters Name=tag-key,Values=Name \
        --query 'Reservations[*].Instances[*].{Instance:InstanceId,AZ:Placement.AvailabilityZone,Name:Tags[?Key==`Name`]|[0].Value}' \
        --output table

Windows::

    aws ec2 describe-instances ^
        --filters Name=tag-key,Values=Name ^
        --query "Reservations[*].Instances[*].{Instance:InstanceId,AZ:Placement.AvailabilityZone,Name:Tags[?Key=='Name']|[0].Value}" ^
        --output table

Output::

    -------------------------------------------------------------
    |                     DescribeInstances                     |
    +--------------+-----------------------+--------------------+
    |      AZ      |       Instance        |        Name        |
    +--------------+-----------------------+--------------------+
    |  us-east-2b  |  i-057750d42936e468a  |  my-prod-server    |
    |  us-east-2a  |  i-001efd250faaa6ffa  |  test-server-1     |
    |  us-east-2a  |  i-027552a73f021f3bd  |  test-server-2     |
    +--------------+-----------------------+--------------------+

**Example 11: To describe instances in a partition placement group**

The following ``describe-instances`` example describes the specified instance. The output includes the placement information for the instance, which contains the placement group name and the partition number for the instance. ::

    aws ec2 describe-instances \
        --instance-ids i-0123a456700123456 \
        --query "Reservations[*].Instances[*].Placement"

Output::

    [
        [
            {
                "AvailabilityZone": "us-east-1c",
                "GroupName": "HDFS-Group-A",
                "PartitionNumber": 3,
                "Tenancy": "default"
            }
        
        ]
    ]

For more information, see `Describing instances in a placement group <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html#describe-instance-placement>`__ in the *Amazon EC2 User Guide*.

**Example 12: To filter to instances with the specified placement group and partition number**

The following ``describe-instances`` example filters the results to only those instances with the specified placement group and partition number. ::

    aws ec2 describe-instances \
        --filters "Name=placement-group-name,Values=HDFS-Group-A" "Name=placement-partition-number,Values=7"

The following shows only the relevant information from the output. ::

    "Instances": [
        {   
            "InstanceId": "i-0123a456700123456",
            "InstanceType": "r4.large",
            "Placement": {
                "AvailabilityZone": "us-east-1c",
                "GroupName": "HDFS-Group-A",
                "PartitionNumber": 7,
                "Tenancy": "default"
            }
        },
        {   
            "InstanceId": "i-9876a543210987654",
            "InstanceType": "r4.large",
            "Placement": {
                "AvailabilityZone": "us-east-1c",
                "GroupName": "HDFS-Group-A",
                "PartitionNumber": 7,
                "Tenancy": "default"
            }
        ],

For more information, see `Describing instances in a placement group <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html#describe-instance-placement>`__ in the *Amazon EC2 User Guide*.

**Example 13: To filter to instances that are configured to allow access to tags from instance metadata**

The following ``describe-instances`` example filters the results to only those instances that are configured to allow access to instance tags from instance metadata. ::

    aws ec2 describe-instances \
        --filters "Name=metadata-options.instance-metadata-tags,Values=enabled" \
        --query "Reservations[*].Instances[*].InstanceId" \
        --output text

The following shows the expected output. ::

    i-1234567890abcdefg
    i-abcdefg1234567890
    i-11111111aaaaaaaaa
    i-aaaaaaaa111111111

For more information, see `Work with instance tags in instance metadata <https://docs.aws.amazon.com/en_us/AWSEC2/latest/UserGuide/Using_Tags.html#view-access-to-tags-in-IMDS>`__ in the *Amazon EC2 User Guide*.