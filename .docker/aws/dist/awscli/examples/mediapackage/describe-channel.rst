**To describe a channel**

The following ``describe-channel`` command displays all of the details of the channel named ``test``. ::

    aws mediapackage describe-channel \
        --id test

Output::

    {
        "Arn": "arn:aws:mediapackage:us-west-2:111222333:channels/584797f1740548c389a273585dd22a63",
        "HlsIngest": {
            "IngestEndpoints": [
                {
                    "Id": "584797f1740548c389a273585dd22a63",
                    "Password": "webdavgeneratedpassword1",
                    "Url": "https://9be9c4405c474882.mediapackage.us-west-2.amazonaws.com/in/v2/584797f1740548c389a273585dd22a63/584797f1740548c389a273585dd22a63/channel",
                    "Username": "webdavgeneratedusername1"
                },
                {
                    "Id": "7d187c8616fd455f88aaa5a9fcf74442",
                    "Password": "webdavgeneratedpassword2",
                    "Url": "https://7bf454c57220328d.mediapackage.us-west-2.amazonaws.com/in/v2/584797f1740548c389a273585dd22a63/7d187c8616fd455f88aaa5a9fcf74442/channel",
                    "Username": "webdavgeneratedusername2"
                }
            ]
        },
        "Id": "test",
        "Tags": {}
    }

For more information, see `Viewing Channel Details<https://docs.aws.amazon.com/mediapackage/latest/ug/channels-view.html>`__ in the *AWS Elemental MediaPackage User Guide*
