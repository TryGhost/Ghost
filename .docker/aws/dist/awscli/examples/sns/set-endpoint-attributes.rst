**To set endpoint attributes**

The following ``set-endpoint-attributes`` example disables the specified platform application endpoint. ::

    aws sns set-endpoint-attributes \
        --endpoint-arn arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234 \
        --attributes Enabled=false

Output::

    {
        "Attributes": {
            "Enabled": "false",
            "Token": "EXAMPLE12345..."
        }
    }
