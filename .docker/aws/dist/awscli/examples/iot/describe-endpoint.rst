**Example 1: To get your current AWS endpoint**

The following ``describe-endpoint`` example retrieves the default AWS endpoint to which all commands are applied. ::

    aws iot describe-endpoint

Output::

    {
        "endpointAddress": "abc123defghijk.iot.us-west-2.amazonaws.com"
    }

For more information, see `DescribeEndpoint <https://docs.aws.amazon.com/iot/latest/developerguide/iot-commands.html#api-iot-DescribeEndpoint>`__ in the *AWS IoT Developer Guide*.

**Example 2: To get your ATS endpoint**

The following ``describe-endpoint`` example retrieves the Amazon Trust Services (ATS) endpoint. ::

    aws iot describe-endpoint \
        --endpoint-type iot:Data-ATS
    
Output::

    {
        "endpointAddress": "abc123defghijk-ats.iot.us-west-2.amazonaws.com"
    }

For more information, see `X.509 Certificates and AWS IoT <https://docs.aws.amazon.com/iot/latest/developerguide/managing-device-certs.html>`__ in the *AWS IoT Developer Guide*.
