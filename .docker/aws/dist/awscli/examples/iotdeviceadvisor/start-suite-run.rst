**To start an IoT Device Advisor test suite run**

The following ``start-suite-run`` example lists the available widgets in your AWS account. ::

    aws iotdeviceadvisor start-suite-run \
        --suite-definition-id qqcsmtyyjabl \
        --suite-definition-version v1 \
        --suite-run-configuration '{"primaryDevice":{"thingArn": "arn:aws:iot:us-east-1:123456789012:thing/MyIotThing","certificateArn":"arn:aws:iot:us-east-1:123456789012:cert/certFile"}}'

Output::

    {
        "suiteRunId": "pwmucgw7lt9s",
        "suiteRunArn": "arn:aws:iotdeviceadvisor:us-east-1:123456789012:suiterun/qqcsmtyyjabl/pwmucgw7lk9s",
        "createdAt": "2022-12-02T15:43:05.581000-05:00"
    }

For more information, see `Start a test suite run <https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-workflow.html#device-advisor-workflow-start-suite-run>`__ in the *AWS IoT Core Developer Guide*.
