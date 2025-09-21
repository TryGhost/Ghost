**To retrieve the rotation status for a KMS key.**

The following ``get-key-rotation-status`` example returns information about the rotation status of the specified KMS key, including whether automatic rotation is enabled, the rotation period, and the next scheduled rotation date. You can use this command on customer managed KMS keys and AWS managed KMS keys. However, all AWS managed KMS keys are automatically rotated every year. ::

    aws kms get-key-rotation-status \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

Output::

    {
        "KeyId": "1234abcd-12ab-34cd-56ef-1234567890ab",
        "KeyRotationEnabled": true,    
        "NextRotationDate": "2024-02-14T18:14:33.587000+00:00",
        "RotationPeriodInDays": 365
    }

For more information, see `Rotating keys <https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html>`__ in the *AWS Key Management Service Developer Guide*.