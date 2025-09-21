**To list the CA certificates registered in your AWS account**

The following ``list-ca-certificates`` example lists the CA certificates registered in your AWS account. ::

    aws iot list-ca-certificates

Output::

    {
        "certificates": [
            {
                "certificateArn": "arn:aws:iot:us-west-2:123456789012:cacert/f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467",
                "certificateId": "f4efed62c0142f16af278166f61962501165c4f0536295207426460058cd1467",
                "status": "INACTIVE",
                "creationDate": 1569365372.053
            }
        ]
    }

For more information, see `Use Your Own Certificate <https://docs.aws.amazon.com/iot/latest/developerguide/device-certs-your-own.html>`__ in the *AWS IoT Developer Guide*.
