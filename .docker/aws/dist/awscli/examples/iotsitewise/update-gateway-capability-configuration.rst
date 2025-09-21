**To update a gateway capability**

The following ``update-gateway-capability-configuration`` example configures an OPC-UA source with the following properties:

- Trusts any certificate.
- Uses the Basic256 algorithm to secure messages.
- Uses the SignAndEncrypt mode to secure connections.
- Uses authentication credentials stored in an AWS Secrets Manager secret.

::

    aws iotsitewise update-gateway-capability-configuration \
        --gateway-id a1b2c3d4-5678-90ab-cdef-1a1a1EXAMPLE \
        --capability-namespace "iotsitewise:opcuacollector:1" \
        --capability-configuration file://opc-ua-capability-configuration.json

Contents of ``opc-ua-capability-configuration.json``::

    {
        "sources": [
            {
                "name": "Wind Farm #1",
                "endpoint": {
                    "certificateTrust": {
                        "type": "TrustAny"
                    },
                    "endpointUri": "opc.tcp://203.0.113.0:49320",
                    "securityPolicy": "BASIC256",
                    "messageSecurityMode": "SIGN_AND_ENCRYPT",
                    "identityProvider": {
                        "type": "Username",
                        "usernameSecretArn": "arn:aws:secretsmanager:us-west-2:123456789012:secret:greengrass-windfarm1-auth-1ABCDE"
                    },
                    "nodeFilterRules": []
                },
                "measurementDataStreamPrefix": ""
            }
        ]
    }

Output::

    {
        "capabilityNamespace": "iotsitewise:opcuacollector:1",
        "capabilitySyncStatus": "OUT_OF_SYNC"
    }

For more information, see `Configuring data sources <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/configure-sources.html>`__ in the *AWS IoT SiteWise User Guide*.