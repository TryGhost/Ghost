**Example 1: To get the information about an IoT Device Advisor Account-level endpoint**

The following ``get-endpoint`` example gets the information about a device advisor Account-level test endpoint. ::

    aws iotdeviceadvisor get-endpoint

Output::

    {
        "endpoint": "t6y4c143x9sfo.deviceadvisor.iot.us-east-1.amazonaws.com"
    }

**Example 2: To get the information about an IoT Device Advisor Device-level endpoint**

The following ``get-endpoint`` example gets the information about a device advisor device-level test endpoint with the specified thing-arn or certificate-arn. ::

    aws iotdeviceadvisor get-endpoint \
        --thing-arn arn:aws:iot:us-east-1:123456789012:thing/MyIotThing

Output::

    {
        "endpoint": "tdb7719be5t6y4c143x9sfo.deviceadvisor.iot.us-east-1.amazonaws.com"
    }

For more information, see `Get a test endpoint <https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-workflow.html#device-advisor-workflow-get-test-endpoint>`__ in the *AWS IoT Core Developer Guide*.
