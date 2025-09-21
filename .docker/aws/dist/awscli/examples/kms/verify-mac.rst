**Example 1: To verify an HMAC**

The following ``verify-mac`` command verifies an HMAC for a particular message, HMAC KMS keys, and MAC algorithm. A value of 'true' in the MacValid value in the response indicates that the HMAC is valid.

In AWS CLI v2, the value of the ``message`` parameter must be Base64-encoded. Or, you can save the message in a file and use the ``fileb://`` prefix, which tells the AWS CLI to read binary data from the file.

The MAC that you specify cannot be base64-encoded. For help decoding the MAC that the ``generate-mac`` command returns, see the ``generate-mac`` command examples.

Before running this command, replace the example key ID with a valid key ID from your AWS account. The key ID must represent a HMAC KMS key with a key usage of ``GENERATE_VERIFY_MAC``. ::

    msg=(echo 'Hello World' | base64)
    
    aws kms verify-mac \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --message fileb://Message \
        --mac-algorithm HMAC_SHA_384 \
        --mac fileb://ExampleMac

Output::

    {
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "MacValid": true,
        "MacAlgorithm": "HMAC_SHA_384"
    }

For more information about using HMAC KMS keys in AWS KMS, see `HMAC keys in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/hmac.html>`__ in the *AWS Key Management Service Developer Guide*.