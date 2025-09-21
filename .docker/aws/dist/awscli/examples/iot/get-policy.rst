**To get information about the default version of a policy**

The following ``get-policy`` example retrieves information about the default version of the specified policy. ::

    aws iot get-policy \
        --policy-name UpdateDeviceCertPolicy

Output::

    {
        "policyName": "UpdateDeviceCertPolicy",
        "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/UpdateDeviceCertPolicy",
        "policyDocument": "{ \"Version\": \"2012-10-17\", \"Statement\": [ { \"Effect\": \"Allow\", \"Action\":  \"iot:UpdateCertificate\", \"Resource\": \"*\" } ] }",
        "defaultVersionId": "2",
        "creationDate": 1559925941.924,
        "lastModifiedDate": 1559925941.924,
        "generationId": "5066f1b6712ce9d2a1e56399771649a272d6a921762fead080e24fe52f24e042"
    }

For more information, see `AWS IoT Policies <https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html>`__ in the *AWS IoT Developers Guide*.

