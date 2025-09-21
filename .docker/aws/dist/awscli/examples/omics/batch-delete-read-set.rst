**To delete multiple read sets**

The following ``batch-delete-read-set`` example deletes two read sets. ::

    aws omics batch-delete-read-set \
        --sequence-store-id 1234567890 \
        --ids 1234567890 0123456789

If there is an error deleting any of the specified read sets, the service returns an error list. ::

    {
        "errors": [
            {
                "code": "",
                "id": "0123456789",
                "message": "The specified readset does not exist."
            }
        ]
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
