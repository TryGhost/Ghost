**To describe the status of a single volume**

This example command describes the status for the volume ``vol-1234567890abcdef0``.

Command::

  aws ec2 describe-volume-status --volume-ids vol-1234567890abcdef0

Output::

   {
       "VolumeStatuses": [
           {
               "VolumeStatus": {
                   "Status": "ok",
                   "Details": [
                       {
                           "Status": "passed",
                           "Name": "io-enabled"
                       },
                       {
                           "Status": "not-applicable",
                           "Name": "io-performance"
                       }
                   ]
               },
               "AvailabilityZone": "us-east-1a",
               "VolumeId": "vol-1234567890abcdef0",
               "Actions": [],
               "Events": []
           }
       ]
   }

**To describe the status of impaired volumes**

This example command describes the status for all volumes that are impaired. In this example output, there are no impaired volumes.

Command::

  aws ec2 describe-volume-status --filters Name=volume-status.status,Values=impaired

Output::

   {
       "VolumeStatuses": []
   }

If you have a volume with a failed status check (status is impaired), see `Working with an Impaired Volume`_ in the *Amazon EC2 User Guide*.

.. _`Working with an Impaired Volume`: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-volume-status.html#work_volumes_impaired
