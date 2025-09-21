**Example 1: To describe an AMI**

The following ``describe-images`` example describes the specified AMI in the specified Region. ::

    aws ec2 describe-images \
        --region us-east-1 \
        --image-ids ami-1234567890EXAMPLE

Output::

    {
        "Images": [
            {
                "VirtualizationType": "hvm", 
                "Description": "Provided by Red Hat, Inc.", 
                "PlatformDetails": "Red Hat Enterprise Linux", 
                "EnaSupport": true, 
                "Hypervisor": "xen", 
                "State": "available", 
                "SriovNetSupport": "simple", 
                "ImageId": "ami-1234567890EXAMPLE", 
                "UsageOperation": "RunInstances:0010", 
                "BlockDeviceMappings": [
                    {
                        "DeviceName": "/dev/sda1", 
                        "Ebs": {
                            "SnapshotId": "snap-111222333444aaabb", 
                            "DeleteOnTermination": true, 
                            "VolumeType": "gp2", 
                            "VolumeSize": 10, 
                            "Encrypted": false
                        }
                    }
                ], 
                "Architecture": "x86_64", 
                "ImageLocation": "123456789012/RHEL-8.0.0_HVM-20190618-x86_64-1-Hourly2-GP2", 
                "RootDeviceType": "ebs", 
                "OwnerId": "123456789012", 
                "RootDeviceName": "/dev/sda1", 
                "CreationDate": "2019-05-10T13:17:12.000Z", 
                "Public": true, 
                "ImageType": "machine", 
                "Name": "RHEL-8.0.0_HVM-20190618-x86_64-1-Hourly2-GP2"
            }
        ]
    }

For more information, see `Amazon Machine Images (AMI) <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To describe AMIs based on filters**

The following ``describe-images`` example describes Windows AMIs provided by Amazon that are backed by Amazon EBS. ::

    aws ec2 describe-images \
        --owners amazon \
        --filters "Name=platform,Values=windows" "Name=root-device-type,Values=ebs"

For an example of the output for ``describe-images``, see Example 1.

For additional examples using filters, see `Listing and filtering your resources <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Filtering.html#Filtering_Resources_CLI>`__ in the *Amazon EC2 User Guide*.

**Example 3: To describe AMIs based on tags**

The following ``describe-images`` example describes all AMIs that have the tag ``Type=Custom``. The example uses the ``--query`` parameter to display only the AMI IDs. ::

    aws ec2 describe-images \
        --filters "Name=tag:Type,Values=Custom" \
        --query 'Images[*].[ImageId]' \
        --output text

Output::

    ami-1234567890EXAMPLE
    ami-0abcdef1234567890

For additional examples using tag filters, see `Working with tags <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#Using_Tags_CLI>`__ in the *Amazon EC2 User Guide*.
