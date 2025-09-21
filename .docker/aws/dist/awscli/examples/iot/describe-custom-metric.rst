**To get information about a Device Defender custom metric**

The following ``describe-custom-metric`` example gets information about a custom metric named ``myCustomMetric``. ::

    aws iot describe-custom-metric \
        --metric-name myCustomMetric

Output::

    {
        "metricName": "myCustomMetric",
        "metricArn": "arn:aws:iot:us-east-1:1234564789012:custommetric/myCustomMetric",
        "metricType": "number",
        "displayName": "My custom metric",
        "creationDate": 2020-11-17T23:02:12.879000-09:00,
        "lastModifiedDate": 2020-11-17T23:02:12.879000-09:00
    }

For more information, see `Custom metrics <https://docs.aws.amazon.com/iot/latest/developerguide/dd-detect-custom-metrics.html>`__ in the *AWS IoT Core Developer Guide*.