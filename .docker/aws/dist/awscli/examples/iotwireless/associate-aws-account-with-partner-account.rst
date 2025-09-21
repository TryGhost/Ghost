**To associate a partner account with your AWS account**

The following ``associate-aws-account-with-partner-account`` example associates the following Sidewalk account credentials with your AWS account. ::

    aws iotwireless associate-aws-account-with-partner-account \
        --sidewalk AmazonId="12345678901234",AppServerPrivateKey="a123b45c6d78e9f012a34cd5e6a7890b12c3d45e6f78a1b234c56d7e890a1234"

Output::

    {
        "Sidewalk": {
            "AmazonId": "12345678901234", 
            "AppServerPrivateKey": "a123b45c6d78e9f012a34cd5e6a7890b12c3d45e6f78a1b234c56d7e890a1234"
        }
    }

For more information, see `Amazon Sidewalk Integration for AWS IoT Core <https://docs.aws.amazon.com/iot/latest/developerguide/iot-sidewalk.html>`__ in the *AWS IoT Developers Guide*.