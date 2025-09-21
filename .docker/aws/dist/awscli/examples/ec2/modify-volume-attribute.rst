**To modify a volume attribute**

This example sets the ``autoEnableIo`` attribute of the volume with the ID ``vol-1234567890abcdef0`` to ``true``. If the command succeeds, no output is returned.

Command::

  aws ec2 modify-volume-attribute --volume-id vol-1234567890abcdef0 --auto-enable-io
