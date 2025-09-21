**To enable automatic rotation of a KMS key**

The following ``enable-key-rotation`` example enables automatic rotation of a customer managed KMS key with a rotation period of 180 days. The KMS key will be rotated one year (approximate 365 days) from the date that this command completes and every year thereafter.

* The ``--key-id`` parameter identifies the KMS key. This example uses a key ARN value, but you can use either the key ID or the ARN of the KMS key.
* The ``--rotation-period-in-days`` parameter specifies the number of days between each rotation date. Specify a value between 90 and 2560 days. If no value is specified, the default value is 365 days.

::

    aws kms enable-key-rotation \
        --key-id arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab \
        --rotation-period-in-days 180

This command produces no output. To verify that the KMS key is enabled, use the ``get-key-rotation-status`` command.

For more information, see `Rotating keys <https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html>`__ in the *AWS Key Management Service Developer Guide*.