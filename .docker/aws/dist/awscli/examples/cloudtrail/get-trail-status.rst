**To get the status of a trail**

The following ``get-trail-status`` command returns the delivery and logging details for ``Trail1``::

  aws cloudtrail get-trail-status --name Trail1

Output::

  {
    "LatestNotificationTime": 1454022144.869, 
    "LatestNotificationAttemptSucceeded": "2016-01-28T23:02:24Z", 
    "LatestDeliveryAttemptTime": "2016-01-28T23:02:24Z", 
    "LatestDeliveryTime": 1454022144.869, 
    "TimeLoggingStarted": "2015-11-06T18:36:38Z", 
    "LatestDeliveryAttemptSucceeded": "2016-01-28T23:02:24Z", 
    "IsLogging": true, 
    "LatestCloudWatchLogsDeliveryTime": 1454022144.918, 
    "StartLoggingTime": 1446834998.695, 
    "StopLoggingTime": 1446834996.933, 
    "LatestNotificationAttemptTime": "2016-01-28T23:02:24Z", 
    "TimeLoggingStopped": "2015-11-06T18:36:36Z"
  }