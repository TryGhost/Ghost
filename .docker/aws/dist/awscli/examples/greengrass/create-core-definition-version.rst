**To create a core definition version**

The following ``create-core-definition-version`` example creates a core definition version and associates it with the specified core definition. The version can contain one core only. Before you can create a core, you must first create and provision the corresponding AWS IoT thing. This process includes the following ``iot`` commands, which return the ``ThingArn`` and ``CertificateArn`` required for the ``create-core-definition-version`` command.

* Create the AWS IoT thing that corresponds to the core device::

    aws iot create-thing \
        --thing-name "MyCoreDevice"

Output::

    {
        "thingArn": "arn:aws:iot:us-west-2:123456789012:thing/MyCoreDevice",
        "thingName": "MyCoreDevice",
        "thingId": "cb419a19-9099-4515-9cec-e9b0e760608a"
    }

* Create public and private keys and the core device certificate for the thing. This example uses the ``create-keys-and-certificate`` command and requires write permissions to the current directory. Alternatively, you can use the ``create-certificate-from-csr`` command. ::

    aws iot create-keys-and-certificate \
        --set-as-active \
        --certificate-pem-outfile "myCore.cert.pem" \
        --public-key-outfile "myCore.public.key" \
        --private-key-outfile "myCore.private.key"

Output::

    {
        "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/123a15ec415668c2349a76170b64ac0878231c1e21ec83c10e92a1EXAMPLExyz",
        "certificatePem": "-----BEGIN CERTIFICATE-----\nMIIDWTCAkGgAwIBATgIUCgq6EGqou6zFqWgIZRndgQEFW+gwDQYJKoZIhvc...KdGewQS\n-----END CERTIFICATE-----\n",
        "keyPair": {
            "PublicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBzrqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqKpRgnn6yq26U3y...wIDAQAB\n-----END PUBLIC KEY-----\n",
            "PrivateKey": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIABAKCAQEAqKpRgnn6yq26U3yt5YFZquyukfRjbMXDcNOK4rMCxDR...fvY4+te\n-----END RSA PRIVATE KEY-----\n"
        },
        "certificateId": "123a15ec415668c2349a76170b64ac0878231c1e21ec83c10e92a1EXAMPLExyz"
    }

* Create an AWS IoT policy that allows ``iot`` and ``greengrass`` actions. For simplicity, the following policy allows actions on all resources, but your policy should be more restrictive. ::

    aws iot create-policy \
        --policy-name "Core_Devices" \
        --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"iot:Publish\",\"iot:Subscribe\",\"iot:Connect\",\"iot:Receive\"],\"Resource\":[\"*\"]},{\"Effect\":\"Allow\",\"Action\":[\"iot:GetThingShadow\",\"iot:UpdateThingShadow\",\"iot:DeleteThingShadow\"],\"Resource\":[\"*\"]},{\"Effect\":\"Allow\",\"Action\":[\"greengrass:*\"],\"Resource\":[\"*\"]}]}"
        
Output::

    {
        "policyName": "Core_Devices",
        "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/Core_Devices",
        "policyDocument": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"iot:Publish\",\"iot:Subscribe\",\"iot:Connect\",\"iot:Receive\"],\"Resource\":[\"*\"]},{\"Effect\":\"Allow\",\"Action\":[\"iot:GetThingShadow\",\"iot:UpdateThingShadow\",\"iot:DeleteThingShadow\"],\"Resource\":[\"*\"]},{\"Effect\":\"Allow\",\"Action\":[\"greengrass:*\"],\"Resource\":[\"*\"]}]}",
        "policyVersionId": "1"
    }

* Attach the policy to the certificate::

    aws iot attach-policy \
        --policy-name "Core_Devices" \
        --target "arn:aws:iot:us-west-2:123456789012:cert/123a15ec415668c2349a76170b64ac0878231c1e21ec83c10e92a1EXAMPLExyz"

This command produces no output.

* Attach the thing to the certificate::

    aws iot attach-thing-principal \
        --thing-name "MyCoreDevice" \
        --principal "arn:aws:iot:us-west-2:123456789012:cert/123a15ec415668c2349a76170b64ac0878231c1e21ec83c10e92a1EXAMPLExyz"

This command produces no output.

* Create the core definition version::

    aws greengrass create-core-definition-version \
        --core-definition-id "582efe12-b05a-409e-9a24-a2ba1bcc4a12" \
        --cores "[{\"Id\":\"MyCoreDevice\",\"ThingArn\":\"arn:aws:iot:us-west-2:123456789012:thing/MyCoreDevice\",\"CertificateArn\":\"arn:aws:iot:us-west-2:123456789012:cert/123a15ec415668c2349a76170b64ac0878231c1e21ec83c10e92a1EXAMPLExyz\",\"SyncShadow\":true}]"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/582efe12-b05a-409e-9a24-a2ba1bcc4a12/versions/3fdc1190-2ce5-44de-b98b-eec8f9571014",
        "Version": "3fdc1190-2ce5-44de-b98b-eec8f9571014",
        "CreationTimestamp": "2019-09-18T00:15:09.838Z",
        "Id": "582efe12-b05a-409e-9a24-a2ba1bcc4a12"
    }

For more information, see `Configure the AWS IoT Greengrass Core <https://docs.aws.amazon.com/greengrass/latest/developerguide/gg-core.html>`__ in the *AWS IoT Greengrass Developer Guide*.
