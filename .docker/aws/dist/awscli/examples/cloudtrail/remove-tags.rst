**To remove tags for a trail**

The following ``remove-tags`` command removes the specified tags for ``Trail1``::

  aws cloudtrail remove-tags --resource-id arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1 --tags-list Key=name Key=location
