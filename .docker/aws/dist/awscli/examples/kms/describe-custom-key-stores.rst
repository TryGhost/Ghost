**Example 1: To get details about an AWS CloudHSM key store**

The following ``describe-custom-key-store`` example displays details about the specified AWS CloudHSM key store. The command is the same for all types of custom key stores, but the output differs with the key store type and, for an external key store, its connectivity option.

By default, this command displays information about all custom key stores in the account and Region. To display information about a particular custom key store, use the ``custom-key-store-name`` or ``custom-key-store-id`` parameter. ::

    aws kms describe-custom-key-stores \
        --custom-key-store-name ExampleCloudHSMKeyStore

The output of this command includes useful details about the AWS CloudHSM key store including its connection state (``ConnectionState``). If the connection state is ``FAILED``, the output includes a ``ConnectionErrorCode`` field that describes the problem. 

Output::

    {
        "CustomKeyStores": [ 
            { 
                "CloudHsmClusterId": "cluster-1a23b4cdefg",
                "ConnectionState": "CONNECTED",
                "CreationDate": "2022-04-05T14:04:55-07:00",
                "CustomKeyStoreId": "cks-1234567890abcdef0",
                "CustomKeyStoreName": "ExampleExternalKeyStore",
                "TrustAnchorCertificate": "<certificate appears here>"
            }
        ]
    }

For more information, see `Viewing an AWS CloudHSM key store <https://docs.aws.amazon.com/kms/latest/developerguide/view-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 2: To get details about an external key store with public endpoint connectivity**

The following ``describe-custom-key-store`` example displays details about the specified external key store. The command is the same for all types of custom key stores, but the output differs with the key store type and, for an external key store, its connectivity option.

By default, this command displays information about all custom key stores in the account and Region. To display information about a particular custom key store, use the ``custom-key-store-name`` or ``custom-key-store-id`` parameter. ::

    aws kms describe-custom-key-stores \
        --custom-key-store-id cks-9876543210fedcba9

The output of this command includes useful details about the external key store including its connection state (``ConnectionState``). If the connection state is ``FAILED``, the output includes a ``ConnectionErrorCode`` field that describes the problem. 

Output::

    {
        "CustomKeyStores": [ 
            { 
                "CustomKeyStoreId": "cks-9876543210fedcba9",
                "CustomKeyStoreName": "ExampleXKS",
                "ConnectionState": "CONNECTED",    
                "CreationDate": "2022-12-02T07:48:55-07:00",
                "CustomKeyStoreType": "EXTERNAL_KEY_STORE",
                "XksProxyConfiguration": { 
                    "AccessKeyId": "ABCDE12345670EXAMPLE",
                    "Connectivity": "PUBLIC_ENDPOINT",
                    "UriEndpoint": "https://myproxy.xks.example.com",
                    "UriPath": "/example-prefix/kms/xks/v1"
                }
            }
        ]
    }

For more information, see `Viewing an external key store <https://docs.aws.amazon.com/kms/latest/developerguide/view-xks-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

**Example 3: To get details about an external key store with VPC endpoint service connectivity**

The following ``describe-custom-key-store`` example displays details about the specified external key store. The command is the same for all types of custom key stores, but the output differs with the key store type and, for an external key store, its connectivity option.

By default, this command displays information about all custom key stores in the account and Region. To display information about a particular custom key store, use the ``custom-key-store-name`` or ``custom-key-store-id`` parameter. ::

    aws kms describe-custom-key-stores \
        --custom-key-store-id cks-2234567890abcdef0

The output of this command includes useful details about the external key store including its connection state (``ConnectionState``). If the connection state is ``FAILED``, the output includes a ``ConnectionErrorCode`` field that describes the problem. 

Output::

    {
        "CustomKeyStores": [ 
            { 
                "CustomKeyStoreId": "cks-3234567890abcdef0",
                "CustomKeyStoreName": "ExampleVPCExternalKeyStore",
                "ConnectionState": "CONNECTED",
                "CreationDate": "2022-12-22T07:48:55-07:00",
                "CustomKeyStoreType": "EXTERNAL_KEY_STORE",
                "XksProxyConfiguration": { 
                    "AccessKeyId": "ABCDE12345670EXAMPLE",
                    "Connectivity": "VPC_ENDPOINT_SERVICE",
                    "UriEndpoint": "https://myproxy-private.xks.example.com",
                    "UriPath": "/kms/xks/v1",
                    "VpcEndpointServiceName": "com.amazonaws.vpce.us-east-1.vpce-svc-example1"
                }
            }
        ]
    }

For more information, see `Viewing an external key store <https://docs.aws.amazon.com/kms/latest/developerguide/view-xks-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.
