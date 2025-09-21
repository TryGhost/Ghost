**To describe a volume attribute**

This example command describes the ``autoEnableIo`` attribute of the volume with the ID ``vol-049df61146c4d7901``.

Command::

  aws ec2 describe-volume-attribute --volume-id vol-049df61146c4d7901 --attribute autoEnableIO

Output::

   {
       "AutoEnableIO": {
           "Value": false
       },
       "VolumeId": "vol-049df61146c4d7901"
   }
