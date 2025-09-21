**To remove a tag from an AWS Direct Connect resource**

The following command removes the tag with the key ``Name`` from connection ``dxcon-abcabc12``. If the command succeeds, no output is returned.

Command::

  aws directconnect untag-resource --resource-arn arn:aws:directconnect:us-east-1:123456789012:dxcon/dxcon-abcabc12 --tag-keys Name

