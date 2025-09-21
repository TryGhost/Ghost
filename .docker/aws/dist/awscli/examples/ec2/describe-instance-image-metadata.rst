**Example 1: To describe the AMI metadata for all instances**

The following ``describe-instance-image-metadata`` example describes the AMI metadata of all the instances in your AWS account in the specified Region. ::

    aws ec2 describe-instance-image-metadata \
        --region us-east-1

Output::

    {
        "InstanceImageMetadata": [
            {
                "InstanceId": "i-1234567890EXAMPLE",
                "InstanceType": "t2.micro",
                "LaunchTime": "2024-08-28T11:25:45+00:00",
                "AvailabilityZone": "us-east-1a",
                "State": {
                    "Code": 16,
                    "Name": "running"
                },
                "OwnerId": "123412341234",
                "Tags": [
                    {
                        "Key": "MyTagName",
                        "Value": "my-tag-value"
                    }
                ],
                "ImageMetadata": {
                    "ImageId": "ami-0b752bf1df193a6c4",
                    "Name": "al2023-ami-2023.5.20240819.0-kernel-6.1-x86_64",
                    "OwnerId": "137112412989",
                    "State": "available",
                    "ImageOwnerAlias": "amazon",
                    "CreationDate": "2023-01-25T17:20:40Z",
                    "DeprecationTime": "2025-01-25T17:20:40Z",
                    "IsPublic": true
                }
            }
        ],
        "NextToken": "...EXAMPLEwIAABAA2JHaFxLnEXAMPLE..."
    }

For more information, see `Amazon Machine Images in Amazon EC2 <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To describe the AMI metadata for the specified instances**

The following ``describe-instance-image-metadata`` example describes the AMI metadata for the specified instances. ::

    aws ec2 describe-instance-image-metadata \
        --region us-east-1 \
        --instance-ids i-1234567890EXAMPLE i-0987654321EXAMPLE

Output::

    {
        "InstanceImageMetadata": [
            {
                "InstanceId": "i-1234567890EXAMPLE",
                "InstanceType": "t2.micro",
                "LaunchTime": "2024-08-28T11:25:45+00:00",
                "AvailabilityZone": "us-east-1a",
                "State": {
                    "Code": 16,
                    "Name": "running"
                },
                "OwnerId": "123412341234",
                "Tags": [
                    {
                        "Key": "MyTagName",
                        "Value": "my-tag-value"
                    }
                ],
                "ImageMetadata": {
                    "ImageId": "ami-0b752bf1df193a6c4",
                    "Name": "al2023-ami-2023.5.20240819.0-kernel-6.1-x86_64",
                    "OwnerId": "137112412989",
                    "State": "available",
                    "ImageOwnerAlias": "amazon",
                    "CreationDate": "2023-01-25T17:20:40Z",
                    "DeprecationTime": "2025-01-25T17:20:40Z",
                    "IsPublic": true
                }
            },
            {
                "InstanceId": "i-0987654321EXAMPLE",
                "InstanceType": "t2.micro",
                "LaunchTime": "2024-08-28T11:25:45+00:00",
                "AvailabilityZone": "us-east-1a",
                "State": {
                    "Code": 16,
                    "Name": "running"
                },
                "OwnerId": "123412341234",
                "Tags": [
                    {
                        "Key": "MyTagName",
                        "Value": "my-tag-value"
                    }
                ],
                "ImageMetadata": {
                    "ImageId": "ami-0b752bf1df193a6c4",
                    "Name": "al2023-ami-2023.5.20240819.0-kernel-6.1-x86_64",
                    "OwnerId": "137112412989",
                    "State": "available",
                    "ImageOwnerAlias": "amazon",
                    "CreationDate": "2023-01-25T17:20:40Z",
                    "DeprecationTime": "2025-01-25T17:20:40Z",
                    "IsPublic": true
                }
            }
        ]
    }

For more information, see `Amazon Machine Images in Amazon EC2 <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html>`__ in the *Amazon EC2 User Guide*.

**Example 3: To describe the AMI metadata for instances based on filters**

The following ``describe-instance-image-metadata`` example describes the AMI metadata for ``t2.nano`` and ``t2.micro`` instances in the ``us-east-1a`` Availability Zone. ::

    aws ec2 describe-instance-image-metadata \
        --region us-east-1 \
        --filters Name=availability-zone,Values=us-east-1a Name=instance-type,Values=t2.nano,t2.micro

Output::

    {
        "InstanceImageMetadata": [
            {
                "InstanceId": "i-1234567890EXAMPLE",
                "InstanceType": "t2.micro",
                "LaunchTime": "2024-08-28T11:25:45+00:00",
                "AvailabilityZone": "us-east-1a",
                "State": {
                    "Code": 16,
                    "Name": "running"
                },
                "OwnerId": "123412341234",
                "Tags": [
                    {
                        "Key": "MyTagName",
                        "Value": "my-tag-value"
                    }
                ],
                "ImageMetadata": {
                    "ImageId": "ami-0b752bf1df193a6c4",
                    "Name": "al2023-ami-2023.5.20240819.0-kernel-6.1-x86_64",
                    "OwnerId": "137112412989",
                    "State": "available",
                    "ImageOwnerAlias": "amazon",
                    "CreationDate": "2023-01-25T17:20:40Z",
                    "DeprecationTime": "2025-01-25T17:20:40Z",
                    "IsPublic": true
                }
            },
            {
                "InstanceId": "i-0987654321EXAMPLE",
                "InstanceType": "t2.micro",
                "LaunchTime": "2024-08-28T11:25:45+00:00",
                "AvailabilityZone": "us-east-1a",
                "State": {
                    "Code": 16,
                    "Name": "running"
                },
                "OwnerId": "123412341234",
                "Tags": [
                    {
                        "Key": "MyTagName",
                        "Value": "my-tag-value"
                    }
                ],
                "ImageMetadata": {
                    "ImageId": "ami-0b752bf1df193a6c4",
                    "Name": "al2023-ami-2023.5.20240819.0-kernel-6.1-x86_64",
                    "OwnerId": "137112412989",
                    "State": "available",
                    "ImageOwnerAlias": "amazon",
                    "CreationDate": "2023-01-25T17:20:40Z",
                    "DeprecationTime": "2025-01-25T17:20:40Z",
                    "IsPublic": true
                }
            }
        ],
        "NextToken": "...EXAMPLEV7ixRYHwIAABAA2JHaFxLnDAzpatfEXAMPLE..."
    }

For more information, see `Amazon Machine Images in Amazon EC2 <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html>`__ in the *Amazon EC2 User Guide*.
