**To list platform application endpoint attributes**

The following ``get-endpoint-attributes`` example lists the attributes for the specified platform application endpoint. ::

    aws sns get-endpoint-attributes \
        --endpoint-arn arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234

Output::

    {
        "Attributes": {
            "Enabled": "true",
            "Token": "EXAMPLE12345..."
        }
    }
