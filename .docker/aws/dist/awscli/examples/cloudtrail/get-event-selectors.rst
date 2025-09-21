**To view the event selector settings for a trail**

The following ``get-event-selectors`` command returns the settings for ``Trail1``::

  aws cloudtrail get-event-selectors --trail-name Trail1

Output::

  {
    "EventSelectors": [
        {
            "IncludeManagementEvents": true,
            "DataResources": [],
            "ReadWriteType": "All"
        }
    ],
    "TrailARN": "arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1"
  }
