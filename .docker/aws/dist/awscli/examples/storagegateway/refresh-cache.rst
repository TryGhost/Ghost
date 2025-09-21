**To refresh the file share cache**

The following ``refresh-cache`` example refreshes the cache for the specified file share. ::

    aws storagegateway refresh-cache \
        --file-share-arn arn:aws:storagegateway:us-east-1:111122223333:share/share-2FA12345

Output::

    {
        "FileShareARN": "arn:aws:storagegateway:us-east-1:111122223333:share/share-2FA12345",
        "NotificationId": "4954d4b1-abcd-ef01-1234-97950a7d3483"
    }

For more information, see `ListFileShares <https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_RefreshCache.html>`__ in the *AWS Storage Gateway Service API Reference*.
