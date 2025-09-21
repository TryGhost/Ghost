**To delete a custom metric**

The following ``delete-custom-metric`` example deletes a custom metric. ::

    aws iot delete-custom-metric \
        --metric-name batteryPercentage \
        --region us-east-1

Output::

    HTTP 200

For more information, see `Custom metrics <https://docs.aws.amazon.com/iot/latest/developerguide/dd-detect-custom-metrics.html>`__ in the *AWS IoT Core Developer Guide*.