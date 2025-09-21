**To describe the instance type**

This example describes the instance type of the specified instance.

Command::

  aws ec2 describe-instance-attribute --instance-id i-1234567890abcdef0 --attribute instanceType

Output::

  {
      "InstanceId": "i-1234567890abcdef0"
      "InstanceType": {
          "Value": "t1.micro"
      }
  }

**To describe the disableApiTermination attribute**

This example describes the ``disableApiTermination`` attribute of the specified instance.

Command::

  aws ec2 describe-instance-attribute --instance-id i-1234567890abcdef0 --attribute disableApiTermination

Output::

  {
  "InstanceId": "i-1234567890abcdef0"
      "DisableApiTermination": {
          "Value": "false"
      }
  }

**To describe the block device mapping for an instance**

This example describes the ``blockDeviceMapping`` attribute of the specified instance.

Command::

  aws ec2 describe-instance-attribute --instance-id i-1234567890abcdef0 --attribute blockDeviceMapping

Output::

  {
      "InstanceId": "i-1234567890abcdef0"
      "BlockDeviceMappings": [
          {
              "DeviceName": "/dev/sda1",
              "Ebs": {
                  "Status": "attached",
                  "DeleteOnTermination": true,
                  "VolumeId": "vol-049df61146c4d7901",
                  "AttachTime": "2013-05-17T22:42:34.000Z"
              }
          },
          {
              "DeviceName": "/dev/sdf",
              "Ebs": {
                  "Status": "attached",
                  "DeleteOnTermination": false,
                  "VolumeId": "vol-049df61146c4d7901",
                  "AttachTime": "2013-09-10T23:07:00.000Z"
              }
          }
      ],
  }
