**Example 1: To create an AWS CloudHSM key store**

The following ``create-custom-key-store`` example creates an AWS CloudHSM key store backed by an AWS CloudHSM cluster using the required parameters. You can also add the ``custom-key-store-type``parameter with the default value: ``AWS_CLOUDHSM``. 

To specify the file input for the ``trust-anchor-certificate`` command in the AWS CLI, the ``file://`` prefix is required. ::

    aws kms create-custom-key-store \
        --custom-key-store-name ExampleCloudHSMKeyStore \
        --cloud-hsm-cluster-id cluster-1a23b4cdefg \
        --key-store-password kmsPswd \
        --trust-anchor-certificate file://customerCA.crt

Output::

    {
        "CustomKeyStoreId": cks-1234567890abcdef0
    }

For more information, see `Creating an AWS CloudHSM key store <https://docs.aws.amazon.com/kms/latest/developerguide/create-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 2: To create an external key store with public endpoint connectivity**

The following ``create-custom-key-store`` example creates an external key store (XKS) that communicates with AWS KMS over the internet.

In this example, the ``XksProxyUriPath`` uses an optional prefix of ``example-prefix``. 

NOTE: If you use AWS CLI version 1.0, run the following command before specifying a parameter with an HTTP or HTTPS value, such as the XksProxyUriEndpoint parameter. ::

    aws configure set cli_follow_urlparam false

Otherwise, AWS CLI version 1.0 replaces the parameter value with the content found at that URI address. ::

    aws kms create-custom-key-store \
        --custom-key-store-name ExamplePublicEndpointXKS \
        --custom-key-store-type EXTERNAL_KEY_STORE \
        --xks-proxy-connectivity PUBLIC_ENDPOINT \
        --xks-proxy-uri-endpoint "https://myproxy.xks.example.com" \
        --xks-proxy-uri-path "/example-prefix/kms/xks/v1" \
        --xks-proxy-authentication-credential "AccessKeyId=ABCDE12345670EXAMPLE, RawSecretAccessKey=DXjSUawnel2fr6SKC7G25CNxTyWKE5PF9XX6H/u9pSo="


Output::

    {
        "CustomKeyStoreId": cks-2234567890abcdef0
    }

For more information, see `Creating an external key store <https://docs.aws.amazon.com/kms/latest/developerguide/create-keystorecreate-xks-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 3: To create an external key store with VPC endpoint service connectivity**

The following ``create-custom-key-store`` example creates an external key store (XKS) that uses an Amazon VPC endpoint service to communicate with AWS KMS. 

NOTE: If you use AWS CLI version 1.0, run the following command before specifying a parameter with an HTTP or HTTPS value, such as the XksProxyUriEndpoint parameter. ::

    aws configure set cli_follow_urlparam false

Otherwise, AWS CLI version 1.0 replaces the parameter value with the content found at that URI address. ::

    aws kms create-custom-key-store \
        --custom-key-store-name ExampleVPCEndpointXKS \
        --custom-key-store-type EXTERNAL_KEY_STORE \
        --xks-proxy-connectivity VPC_ENDPOINT_SERVICE \
        --xks-proxy-uri-endpoint "https://myproxy-private.xks.example.com" \
        --xks-proxy-uri-path "/kms/xks/v1" \
        --xks-proxy-vpc-endpoint-service-name "com.amazonaws.vpce.us-east-1.vpce-svc-example1" \
        --xks-proxy-authentication-credential "AccessKeyId=ABCDE12345670EXAMPLE, RawSecretAccessKey=DXjSUawnel2fr6SKC7G25CNxTyWKE5PF9XX6H/u9pSo="

Output::

    {
        "CustomKeyStoreId": cks-3234567890abcdef0
    }

For more information, see `Creating an external key store <https://docs.aws.amazon.com/kms/latest/developerguide/create-keystorecreate-xks-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.