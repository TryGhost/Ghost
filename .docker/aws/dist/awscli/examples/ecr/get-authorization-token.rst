**To get an authorization token for your default registry**

The following ``get-authorization-token`` example command gets an authorization token for your default registry. ::

    aws ecr get-authorization-token

Output::

    {
        "authorizationData": [
            {
                "authorizationToken": "QVdTOkN...",
                "expiresAt": 1448875853.241,
                "proxyEndpoint": "https://123456789012.dkr.ecr.us-west-2.amazonaws.com"
            }
        ]
    }
