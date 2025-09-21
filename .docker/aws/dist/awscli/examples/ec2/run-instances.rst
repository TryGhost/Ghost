**Example 1: To launch an instance into a default subnet**

The following ``run-instances`` example launches a single instance of type ``t2.micro`` into the default subnet for the current Region and associates it with the default subnet for the default VPC for the Region. The key pair is optional if you do not plan to connect to your instance using SSH (Linux) or RDP (Windows). ::

    aws ec2 run-instances \
        --image-id ami-0abcdef1234567890 \
        --instance-type t2.micro \
        --key-name MyKeyPair 

Output::

    {
        "Instances": [
            {
                "AmiLaunchIndex": 0,
                "ImageId": "ami-0abcdef1234567890",
                "InstanceId": "i-1231231230abcdef0",
                "InstanceType": "t2.micro",
                "KeyName": "MyKeyPair",
                "LaunchTime": "2018-05-10T08:05:20.000Z",
                "Monitoring": {
                    "State": "disabled"
                },
                "Placement": {
                    "AvailabilityZone": "us-east-2a",
                    "GroupName": "",
                    "Tenancy": "default"
                },
                "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                "PrivateIpAddress": "10.0.0.157",
                "ProductCodes": [],
                "PublicDnsName": "",
                "State": {
                    "Code": 0,
                    "Name": "pending"
                },
                "StateTransitionReason": "",
                "SubnetId": "subnet-04a636d18e83cfacb",
                "VpcId": "vpc-1234567890abcdef0",
                "Architecture": "x86_64",
                "BlockDeviceMappings": [],
                "ClientToken": "",
                "EbsOptimized": false,
                "Hypervisor": "xen",
                "NetworkInterfaces": [
                    {
                        "Attachment": {
                            "AttachTime": "2018-05-10T08:05:20.000Z",
                            "AttachmentId": "eni-attach-0e325c07e928a0405",
                            "DeleteOnTermination": true,
                            "DeviceIndex": 0,
                            "Status": "attaching"
                        },
                        "Description": "",
                        "Groups": [
                            {
                                "GroupName": "MySecurityGroup",
                                "GroupId": "sg-0598c7d356eba48d7"
                            }
                        ],
                        "Ipv6Addresses": [],
                        "MacAddress": "0a:ab:58:e0:67:e2",
                        "NetworkInterfaceId": "eni-0c0a29997760baee7",
                        "OwnerId": "123456789012",
                        "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                        "PrivateIpAddress": "10.0.0.157",
                        "PrivateIpAddresses": [
                            {
                                "Primary": true,
                                "PrivateDnsName": "ip-10-0-0-157.us-east-2.compute.internal",
                                "PrivateIpAddress": "10.0.0.157"
                            }
                        ],
                        "SourceDestCheck": true,
                        "Status": "in-use",
                        "SubnetId": "subnet-04a636d18e83cfacb",
                        "VpcId": "vpc-1234567890abcdef0",
                        "InterfaceType": "interface"
                    }
                ],
                "RootDeviceName": "/dev/xvda",
                "RootDeviceType": "ebs",
                "SecurityGroups": [
                    {
                        "GroupName": "MySecurityGroup",
                        "GroupId": "sg-0598c7d356eba48d7"
                    }
                ],
                "SourceDestCheck": true,
                "StateReason": {
                    "Code": "pending",
                    "Message": "pending"
                },
                "Tags": [],
                "VirtualizationType": "hvm",
                "CpuOptions": {
                    "CoreCount": 1,
                    "ThreadsPerCore": 1
                },
                "CapacityReservationSpecification": {
                    "CapacityReservationPreference": "open"
                },
                "MetadataOptions": {
                    "State": "pending",
                    "HttpTokens": "optional",
                    "HttpPutResponseHopLimit": 1,
                    "HttpEndpoint": "enabled"
                }
            }
        ],
        "OwnerId": "123456789012",
        "ReservationId": "r-02a3f596d91211712"
    }

**Example 2: To launch an instance into a non-default subnet and add a public IP address**

The following ``run-instances`` example requests a public IP address for an instance that you're launching into a nondefault subnet. The instance is associated with the specified security group. ::

    aws ec2 run-instances \
        --image-id ami-0abcdef1234567890 \
        --instance-type t2.micro \
        --subnet-id subnet-08fc749671b2d077c \
        --security-group-ids sg-0b0384b66d7d692f9 \
        --associate-public-ip-address \
        --key-name MyKeyPair 

For an example of the output for ``run-instances``, see Example 1.

**Example 3: To launch an instance with additional volumes**

The following ``run-instances`` example uses a block device mapping, specified in mapping.json, to attach additional volumes at launch. A block device mapping can specify EBS volumes, instance store volumes, or both EBS volumes and instance store volumes. ::

    aws ec2 run-instances \
        --image-id ami-0abcdef1234567890 \
        --instance-type t2.micro \
        --subnet-id subnet-08fc749671b2d077c \
        --security-group-ids sg-0b0384b66d7d692f9 \
        --key-name MyKeyPair \
        --block-device-mappings file://mapping.json

Contents of ``mapping.json``. This example adds ``/dev/sdh`` an empty EBS volume with a size of 100 GiB. ::

    [
        {
            "DeviceName": "/dev/sdh",
            "Ebs": {
                "VolumeSize": 100
            }
        }
    ]

Contents of ``mapping.json``. This example adds ``ephemeral1`` as an instance store volume. ::

    [
        {
            "DeviceName": "/dev/sdc",
            "VirtualName": "ephemeral1"
        }
    ]

For an example of the output for ``run-instances``, see Example 1.

For more information about block device mappings, see `Block device mapping <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/block-device-mapping-concepts.html>`__ in the *Amazon EC2 User Guide*.

**Example 4: To launch an instance and add tags on creation**

The following ``run-instances`` example adds a tag with a key of ``webserver`` and value of ``production`` to the instance. The command also applies a tag with a key of ``cost-center`` and a value of ``cc123`` to any EBS volume that's created (in this case, the root volume). ::

    aws ec2 run-instances \
        --image-id ami-0abcdef1234567890 \
        --instance-type t2.micro \
        --count 1 \
        --subnet-id subnet-08fc749671b2d077c \
        --key-name MyKeyPair \
        --security-group-ids sg-0b0384b66d7d692f9 \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=webserver,Value=production}]' 'ResourceType=volume,Tags=[{Key=cost-center,Value=cc123}]' 

For an example of the output for ``run-instances``, see Example 1.

**Example 5: To launch an instance with user data**

The following ``run-instances`` example passes user data in a file called ``my_script.txt`` that contains a configuration script for your instance. The script runs at launch. ::

    aws ec2 run-instances \
        --image-id ami-0abcdef1234567890 \
        --instance-type t2.micro \
        --count 1 \
        --subnet-id subnet-08fc749671b2d077c \
        --key-name MyKeyPair \
        --security-group-ids sg-0b0384b66d7d692f9 \
        --user-data file://my_script.txt 

For an example of the output for ``run-instances``, see Example 1. 

For more information about instance user data, see `Working with instance user data <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-add-user-data.html>`__ in the *Amazon EC2 User Guide*.

**Example 6: To launch a burstable performance instance**

The following ``run-instances`` example launches a t2.micro instance with the ``unlimited`` credit option. When you launch a T2 instance, if you do not specify ``--credit-specification``, the default is the ``standard`` credit option. When you launch a T3 instance, the default is the ``unlimited`` credit option. ::

    aws ec2 run-instances \
        --image-id ami-0abcdef1234567890 \
        --instance-type t2.micro \
        --count 1 \
        --subnet-id subnet-08fc749671b2d077c \
        --key-name MyKeyPair \
        --security-group-ids sg-0b0384b66d7d692f9 \
        --credit-specification CpuCredits=unlimited

For an example of the output for ``run-instances``, see Example 1.

For more information about burstable performance instances, see `Burstable performance instances <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html>`__ in the *Amazon EC2 User Guide*.
