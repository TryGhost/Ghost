**To create an empty General Purpose SSD (gp2) volume**

The following ``create-volume`` example creates an 80 GiB General Purpose SSD (gp2) volume in the specified Availability Zone. Note that the current Region must be ``us-east-1``, or you can add the ``--region`` parameter to specify the Region for the command. ::

    aws ec2 create-volume \
        --volume-type gp2 \
        --size 80 \
        --availability-zone us-east-1a

Output::

    {
        "AvailabilityZone": "us-east-1a",
        "Tags": [],
        "Encrypted": false,
        "VolumeType": "gp2",
        "VolumeId": "vol-1234567890abcdef0",
        "State": "creating",
        "Iops": 240,
        "SnapshotId": "",
        "CreateTime": "YYYY-MM-DDTHH:MM:SS.000Z",
        "Size": 80
    }

If you do not specify a volume type, the default volume type is ``gp2``. ::

    aws ec2 create-volume \
        --size 80 \
        --availability-zone us-east-1a

**Example 2: To create a Provisioned IOPS SSD (io1) volume from a snapshot**

The following ``create-volume`` example creates a Provisioned IOPS SSD (io1) volume with 1000 provisioned IOPS in the specified Availability Zone using the specified snapshot. ::

    aws ec2 create-volume \
        --volume-type io1 \
        --iops 1000 \
        --snapshot-id snap-066877671789bd71b \
        --availability-zone us-east-1a  

Output::

    {
        "AvailabilityZone": "us-east-1a",
        "Tags": [],
        "Encrypted": false,
        "VolumeType": "io1",
        "VolumeId": "vol-1234567890abcdef0",
        "State": "creating",
        "Iops": 1000,
        "SnapshotId": "snap-066877671789bd71b",
        "CreateTime": "YYYY-MM-DDTHH:MM:SS.000Z",
        "Size": 500
    }

**Example 3: To create an encrypted volume**

The following ``create-volume`` example creates an encrypted volume using the default CMK for EBS encryption. If encryption by default is disabled, you must specify the ``--encrypted`` parameter as follows. ::

    aws ec2 create-volume \
        --size 80 \
        --encrypted \
        --availability-zone us-east-1a 

Output::

    {
        "AvailabilityZone": "us-east-1a",
        "Tags": [],
        "Encrypted": true,
        "VolumeType": "gp2",
        "VolumeId": "vol-1234567890abcdef0",
        "State": "creating",
        "Iops": 240,
        "SnapshotId": "",
        "CreateTime": "YYYY-MM-DDTHH:MM:SS.000Z",
        "Size": 80
    }

If encryption by default is enabled, the following example command creates an encrypted volume, even without the ``--encrypted`` parameter. ::

    aws ec2 create-volume \
        --size 80 \
        --availability-zone us-east-1a 

If you use the ``--kms-key-id`` parameter to specify a customer managed CMK, you must specify the ``--encrypted`` parameter even if encryption by default is enabled. ::

    aws ec2 create-volume \
        --volume-type gp2 \
        --size 80 \
        --encrypted \
        --kms-key-id 0ea3fef3-80a7-4778-9d8c-1c0c6EXAMPLE \
        --availability-zone us-east-1a 

**Example 4: To create a volume with tags**

The following ``create-volume`` example creates a volume and adds two tags. ::

    aws ec2 create-volume \
        --availability-zone us-east-1a \
        --volume-type gp2 \
        --size 80 \
        --tag-specifications 'ResourceType=volume,Tags=[{Key=purpose,Value=production},{Key=cost-center,Value=cc123}]'
