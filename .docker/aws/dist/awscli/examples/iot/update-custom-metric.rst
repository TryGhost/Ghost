**To update a custom metric**

The following ``update-custom-metric`` example updates a custom metric to have a new ``display-name``. ::

    aws iot update-custom-metric \
        --metric-name batteryPercentage \
        --display-name 'remaining battery percentage on device' \
        --region us-east-1

Output::

    {
        "metricName": "batteryPercentage",
        "metricArn": "arn:aws:iot:us-east-1:1234564789012:custommetric/batteryPercentage",
        "metricType": "number",
        "displayName": "remaining battery percentage on device",
        "creationDate": "2020-11-17T23:01:35.110000-08:00",
        "lastModifiedDate": "2020-11-17T23:02:12.879000-08:00"
    }

For more information, see `Custom metrics <https://docs.aws.amazon.com/iot/latest/developerguide/dd-detect-custom-metrics.html>`__ in the *AWS IoT Core Developer Guide*.