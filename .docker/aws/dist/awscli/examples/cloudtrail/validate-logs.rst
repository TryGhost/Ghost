**To validate a log file**

The following ``validate-logs`` command validates the logs for ``Trail1``::

  aws cloudtrail validate-logs --trail-arn arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1 --start-time 20160129T19:00:00Z

Output::

  Validating log files for trail arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1 between 2016-01-29T19:00:00Z and 2016-01-29T22:15:43Z
  Results requested for 2016-01-29T19:00:00Z to 2016-01-29T22:15:43Z
  Results found for 2016-01-29T19:24:57Z to 2016-01-29T21:24:57Z:
  3/3 digest files valid
  15/15 log files valid