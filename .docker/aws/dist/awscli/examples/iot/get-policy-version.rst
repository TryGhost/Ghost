**To get information about a specific version of a policy**

The following ``get-policy-version`` example gets information about the first version of the specified policy. ::

    aws iot get-policy \
        --policy-name UpdateDeviceCertPolicy
        --policy-version-id "1"

Output::

    {
        "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/UpdateDeviceCertPolicy",
        "policyName": "UpdateDeviceCertPolicy",
        "policyDocument": "{ \"Version\": \"2012-10-17\", \"Statement\": [ { \"Effect\": \"Allow\", \"Action\":  \"iot:UpdateCertificate\", \"Resource\": \"*\" } ] }",
        "policyVersionId": "1",
        "isDefaultVersion": false,
        "creationDate": 1559925941.924,
        "lastModifiedDate": 1559926175.458,
        "generationId": "5066f1b6712ce9d2a1e56399771649a272d6a921762fead080e24fe52f24e042"
    }

For more information, see `AWS IoT Policies <https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html>`__ in the *AWS IoT Developers Guide*.

