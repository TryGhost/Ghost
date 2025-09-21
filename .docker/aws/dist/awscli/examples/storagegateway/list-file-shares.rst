**To list file shares**

The following ``command-name`` example lists the available widgets in your AWS account. ::

    aws storagegateway list-file-shares \
        --gateway-arn arn:aws:storagegateway:us-east-1:209870788375:gateway/sgw-FB02E292

Output::

    {
        "FileShareInfoList": [
            {
                "FileShareType": "NFS",
                "FileShareARN": "arn:aws:storagegateway:us-east-1:111122223333:share/share-2FA12345",
                "FileShareId": "share-2FA12345",
                "FileShareStatus": "AVAILABLE",
                "GatewayARN": "arn:aws:storagegateway:us-east-1:111122223333:gateway/sgw-FB0AAAAA"
            }
        ],
        "Marker": null
    }

For more information, see `ListFileShares <https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_ListFileShares.html>`__ in the *AWS Storage Gateway Service API Reference*.
