**To update a policy with a new version**

The following ``create-policy-version`` example updates a policy definition, creating a new policy version. This example also makes the new version the default. ::

    aws iot create-policy-version \
        --policy-name UpdateDeviceCertPolicy \
        --policy-document file://policy.json \
        --set-as-default

Contents of ``policy.json``::

    {
        "Version": "2012-10-17", 
        "Statement": [
            { 
                "Effect": "Allow", 
                "Action":  "iot:UpdateCertificate",
                "Resource": "*" 
            } 
        ] 
    }

Output::

    {
        "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/UpdateDeviceCertPolicy",
        "policyDocument": "{ \"Version\": \"2012-10-17\", \"Statement\": [ { \"Effect\": \"Allow\", \"Action\":  \"iot:UpdateCertificate\", \"Resource\": \"*\" } ] }",
        "policyVersionId": "2",
        "isDefaultVersion": true
    }

For more information, see `AWS IoT Policies <https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html>`__ in the *AWS IoT Developers Guide*.
