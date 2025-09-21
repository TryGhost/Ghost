**To create a custom metric published by your devices to Device Defender**

The following ``create-custom-metric`` example creates a custom metric that measures battery percentage. ::

    aws iot create-custom-metric \
        --metric-name "batteryPercentage" \
        --metric-type "number" \
        --display-name "Remaining battery percentage." \
        --region us-east-1 \
        --client-request-token "02ccb92b-33e8-4dfa-a0c1-35b181ed26b0" 

Output::

    {
        "metricName": "batteryPercentage",
        "metricArn": "arn:aws:iot:us-east-1:1234564789012:custommetric/batteryPercentage"
    }

For more information, see `Custom metrics <https://docs.aws.amazon.com/iot/latest/developerguide/dd-detect-custom-metrics.html>`__ in the *AWS IoT Core Developer Guide*.