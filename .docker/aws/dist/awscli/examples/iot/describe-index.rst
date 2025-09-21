**To retrieve the current status of the thing index**

The following ``describe-index`` example retrieves the current status of the thing index. ::

    aws iot describe-index \
        --index-name "AWS_Things"

Output::

    {
        "indexName": "AWS_Things",
        "indexStatus": "ACTIVE",
        "schema": "REGISTRY_AND_SHADOW_AND_CONNECTIVITY_STATUS"
    }

For more information, see `Managing Thing Indexing <https://docs.aws.amazon.com/iot/latest/developerguide/managing-index.html>`__ in the *AWS IoT Developer Guide*.
