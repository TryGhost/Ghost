**To retrieve the encryption configuration**

The following ``get-encryption-config`` example retrieves the current encryption configuration for your AWS X-Ray data. ::
   
   aws xray get-encryption-config
   
Output::

    {
        "EncryptionConfig": {
            "KeyId": "ae4aa6d49-a4d8-9df9-a475-4ff6d7898456",
            "Status": "ACTIVE",
            "Type": "NONE"
        }
    }

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html>`__ in the *AWS X-Ray Developer Guide*.
