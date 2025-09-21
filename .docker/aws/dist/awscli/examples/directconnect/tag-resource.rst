**To add a tag to an AWS Direct Connect resource**

The following command adds a tag with a key of ``Name`` and a value of ``VAConnection`` to the connection ``dxcon-abcabc12``. If the command succeeds, no output is returned.

Command::

  aws directconnect tag-resource --resource-arn arn:aws:directconnect:us-east-1:123456789012:dxcon/dxcon-abcabc12 --tags "key=Name,value=VAConnection"

