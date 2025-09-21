**To list your custom metrics**

The following ``list-custom-metrics`` example lists all of your custom metrics. ::

    aws iot list-custom-metrics \
        --region us-east-1

Output::

    {
        "metricNames": [
            "batteryPercentage"
        ]
    }

For more information, see `Custom metrics <https://docs.aws.amazon.com/iot/latest/developerguide/dd-detect-custom-metrics.html>`__ in the *AWS IoT Core Developer Guide*.