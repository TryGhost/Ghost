**To get status information for the configuration recorder**

The following command returns the status of the default configuration recorder::

    aws configservice describe-configuration-recorder-status

Output::

    {
        "ConfigurationRecordersStatus": [
            {
                "name": "default",
                "lastStatus": "SUCCESS",
                "recording": true,
                "lastStatusChangeTime": 1452193834.344,
                "lastStartTime": 1441039997.819,
                "lastStopTime": 1441039992.835
            }
        ]
    }