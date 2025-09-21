**To create a snapshot**

This example command creates a snapshot of the volume with a volume ID of ``vol-1234567890abcdef0`` and a short description to identify the snapshot.

Command::

  aws ec2 create-snapshot --volume-id vol-1234567890abcdef0 --description "This is my root volume snapshot"

Output::

   {
       "Description": "This is my root volume snapshot",
       "Tags": [],
       "Encrypted": false,
       "VolumeId": "vol-1234567890abcdef0",
       "State": "pending",
       "VolumeSize": 8,
       "StartTime": "2018-02-28T21:06:01.000Z",
       "Progress": "",
       "OwnerId": "012345678910",
       "SnapshotId": "snap-066877671789bd71b"
   }

**To create a snapshot with tags**

This example command creates a snapshot and applies two tags: purpose=prod and costcenter=123.

Command::

  aws ec2 create-snapshot --volume-id vol-1234567890abcdef0 --description 'Prod backup' --tag-specifications 'ResourceType=snapshot,Tags=[{Key=purpose,Value=prod},{Key=costcenter,Value=123}]'

Output::

  {
      "Description": "Prod backup",
      "Tags": [
          {
              "Value": "prod",
              "Key": "purpose"
          },
          {
              "Value": "123",
              "Key": "costcenter"
          }
       ],
       "Encrypted": false,
       "VolumeId": "vol-1234567890abcdef0",
       "State": "pending",
       "VolumeSize": 8,
       "StartTime": "2018-02-28T21:06:06.000Z",
       "Progress": "",
       "OwnerId": "012345678910",
       "SnapshotId": "snap-09ed24a70bc19bbe4"
   }
