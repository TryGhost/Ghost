**Example 1: To describe a Spot Instance request**

The following ``describe-spot-instance-requests`` example describes the specified Spot Instance request. ::

    aws ec2 describe-spot-instance-requests \
        --spot-instance-request-ids sir-08b93456

Output::

    {
        "SpotInstanceRequests": [
            {
                "CreateTime": "2018-04-30T18:14:55.000Z",
                "InstanceId": "i-1234567890abcdef1",
                "LaunchSpecification": {
                    "InstanceType": "t2.micro",
                    "ImageId": "ami-003634241a8fcdec0",
                    "KeyName": "my-key-pair",
                    "SecurityGroups": [
                        {
                            "GroupName": "default",
                            "GroupId": "sg-e38f24a7"
                        }
                    ],
                    "BlockDeviceMappings": [
                        {
                            "DeviceName": "/dev/sda1",
                            "Ebs": {
                                "DeleteOnTermination": true,
                                "SnapshotId": "snap-0e54a519c999adbbd",
                                "VolumeSize": 8,
                                "VolumeType": "standard",
                                "Encrypted": false
                            }
                        }
                    ],
                    "NetworkInterfaces": [
                        {
                            "DeleteOnTermination": true,
                            "DeviceIndex": 0,
                            "SubnetId": "subnet-049df61146c4d7901"
                        }
                    ],
                    "Placement": {
                        "AvailabilityZone": "us-east-2b",
                        "Tenancy": "default"
                    },
                    "Monitoring": {
                        "Enabled": false
                    }
                },
                "LaunchedAvailabilityZone": "us-east-2b",
                "ProductDescription": "Linux/UNIX",
                "SpotInstanceRequestId": "sir-08b93456",
                "SpotPrice": "0.010000"
                "State": "active",
                "Status": {
                    "Code": "fulfilled",
                    "Message": "Your Spot request is fulfilled.",
                    "UpdateTime": "2018-04-30T18:16:21.000Z"
                },
                "Tags": [],
                "Type": "one-time",
                "InstanceInterruptionBehavior": "terminate"
            }
        ]
    }

**Example 2: To describe Spot Instance requests based on filters**

The following ``describe-spot-instance-requests`` example uses filters to scope the results to Spot Instance requests with the specified instance type in the specified Availability Zone. The example uses the ``--query`` parameter to display only the instance IDs. ::

    aws ec2 describe-spot-instance-requests \
        --filters Name=launch.instance-type,Values=m3.medium Name=launched-availability-zone,Values=us-east-2a \
        --query "SpotInstanceRequests[*].[InstanceId]" \
        --output text

Output::

    i-057750d42936e468a
    i-001efd250faaa6ffa
    i-027552a73f021f3bd
    ...

For additional examples using filters, see `Listing and filtering your resources <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Filtering.html#Filtering_Resources_CLI>`__ in the *Amazon Elastic Compute Cloud User Guide*.

**Example 3: To describe Spot Instance requests based on tags**

The following ``describe-spot-instance-requests`` example uses tag filters to scope the results to Spot Instance requests that have the tag ``cost-center=cc123``. ::

    aws ec2 describe-spot-instance-requests \
        --filters Name=tag:cost-center,Values=cc123

For an example of the output for ``describe-spot-instance-requests``, see Example 1.

For additional examples using tag filters, see `Working with tags <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#Using_Tags_CLI>`__ in the *Amazon EC2 User Guide*.
