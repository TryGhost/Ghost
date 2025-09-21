**Example 1: To edit the friendly name of a custom key store**

The following ``update-custom-key-store`` example changes the name of the custom key store. This example works for an AWS CloudHSM key store or an external key store.

Use the ``custom-key-store-id`` to identify the key store. Use the ``new-custom-key-store-name`` parameter to specify the new friendly name.

To update the friendly name of an AWS CloudHSM key store, you must first disconnect the key store, such as by using the ``disconnect-custom-key-store`` command. You can update the friendly name of an external key store while it is connected or disconnected. To find the connection state of your custom key store, use the ``describe-custom-key-store`` command. ::

    aws kms update-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0 \
        --new-custom-key-store-name ExampleKeyStore

This command does not return any data. To verify that the command worked, use a ``describe-custom-key-stores`` command.

For more information about updating an AWS CloudHSM key store, see `Editing AWS CloudHSM key store settings <https://docs.aws.amazon.com/kms/latest/developerguide/update-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

For more information about updating an external key store, see `Editing external key store properties <https://docs.aws.amazon.com/kms/latest/developerguide/update-xks-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 2: To edit the kmsuser password of an AWS CloudHSM key store**

The following ``update-custom-key-store`` example updates the value of the ``kmsuser`` password to the current password for the ``kmsuser`` in the CloudHSM cluster associated with the specified key store. This command doesn't change the ``kmsuser`` password it the cluster. It just tells AWS KMS the current password. If KMS doesn't have the current ``kmsuser`` password, it cannot connect to the AWS CloudHSM key store.

**NOTE:** Before updating an AWS CloudHSM key store, you must disconnect it. Use the ``disconnect-custom-key-store`` command. After the command completes, you can reconnect the AWS CloudHSM key store. Use the ``connect-custom-key-store`` command. ::

    aws kms update-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0 \
        --key-store-password ExamplePassword

This command does not return any output. To verify that the change was effective, use a ``describe-custom-key-stores`` command. 

For more information about updating an AWS CloudHSM key store, see `Editing AWS CloudHSM key store settings <https://docs.aws.amazon.com/kms/latest/developerguide/update-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 3: To edit the AWS CloudHSM cluster of an AWS CloudHSM key store**

The following example changes the AWS CloudHSM cluster that is associated with an AWS CloudHSM key store to a related cluster, such as a different backup of the same cluster. 

**NOTE:** Before updating an AWS CloudHSM key store, you must disconnect it. Use the ``disconnect-custom-key-store`` command. After the command completes, you can reconnect the AWS CloudHSM key store. Use the ``connect-custom-key-store`` command. ::

    aws kms update-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0 \
        --cloud-hsm-cluster-id cluster-1a23b4cdefg

This command does not return any output. To verify that the change was effective, use a ``describe-custom-key-stores`` command. 

For more information about updating an AWS CloudHSM key store, see `Editing AWS CloudHSM key store settings <https://docs.aws.amazon.com/kms/latest/developerguide/update-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 4: To edit the proxy authentication credential of an external key store**

The following example updates the proxy authentication credential for your external key store. You must specify both the ``raw-secret-access-key`` and the ``access-key-id``, even if you are changing only one of the values. You can use this feature to fix an invalid credential or to change the credential when the external key store proxy rotates it.

Establish the proxy authentication credential for AWS KMS on your external key store. Then use this command to provide the credential to AWS KMS. AWS KMS uses this credential to sign its requests to your external key store proxy.

You can update the proxy authentication credential while the external key store is connected or disconnected. To find the connection state of your custom key store, use the ``describe-custom-key-store`` command. ::

    aws kms update-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0 \
        --xks-proxy-authentication-credential "AccessKeyId=ABCDE12345670EXAMPLE, RawSecretAccessKey=DXjSUawnel2fr6SKC7G25CNxTyWKE5PF9XX6H/u9pSo="

This command does not return any output. To verify that the change was effective, use a ``describe-custom-key-stores`` command. 

For more information about updating an external key store, see `Editing external key store properties <https://docs.aws.amazon.com/kms/latest/developerguide/update-xks-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 5: To edit the proxy connectivity of an external key store**

The following example changes the external key store proxy connectivity option from public endpoint connectivity to VPC endpoint service connectivity. In addition to changing the ``xks-proxy-connectivity`` value, you must change the ``xks-proxy-uri-endpoint`` value to reflect the private DNS name associated with the VPC endpoint service. You must also add an ``xks-proxy-vpc-endpoint-service-name`` value.

**NOTE:** Before updating the proxy connectivity of an external store, you must disconnect it. Use the ``disconnect-custom-key-store`` command. After the command completes, you can reconnect the external key store by using the ``connect-custom-key-store`` command. ::

    aws kms update-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0 \
        --xks-proxy-connectivity VPC_ENDPOINT_SERVICE \
        --xks-proxy-uri-endpoint "https://myproxy-private.xks.example.com" \
        --xks-proxy-vpc-endpoint-service-name "com.amazonaws.vpce.us-east-1.vpce-svc-example"

This command does not return any output. To verify that the change was effective, use a ``describe-custom-key-stores`` command. 

For more information about updating an external key store, see `Editing external key store properties <https://docs.aws.amazon.com/kms/latest/developerguide/update-xks-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.