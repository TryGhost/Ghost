**To list the endpoints for a platform application**

The following ``list-endpoints-by-platform-application`` example lists the endpoints and endpoint attributes for the specified platform application. ::

    aws sns list-endpoints-by-platform-application \
        --platform-application-arn arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication

Output::

    {
        "Endpoints": [
            {
                "Attributes": {
                    "Token": "EXAMPLE12345...,
                    "Enabled": "true"
                },
                "EndpointArn": "arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234"
            }
        ]
    }
