**Retrieves the Legal Hold status of an object**

The following ``get-object-legal-hold`` example retrieves the Legal Hold status for the specified object. ::

    aws s3api get-object-legal-hold \
        --bucket amzn-s3-demo-bucket-with-object-lock \
        --key doc1.rtf

Output::

    {
        "LegalHold": {
            "Status": "ON"
        }
    }
