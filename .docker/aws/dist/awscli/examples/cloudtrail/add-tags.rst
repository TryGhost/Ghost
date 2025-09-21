**To add tags to trail**

The following ``add-tags`` command adds tags for ``Trail1``::

  aws cloudtrail add-tags --resource-id arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1 --tags-list Key=name,Value=Alice Key=location,Value=us
