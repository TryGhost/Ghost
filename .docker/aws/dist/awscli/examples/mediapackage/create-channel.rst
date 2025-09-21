**To create a channel**

The following ``create-channel`` command creates a channel named ``sportschannel`` in the current account. ::

    aws mediapackage create-channel --id sportschannel

Output::

    {
       "Arn": "arn:aws:mediapackage:us-west-2:111222333:channels/6d345804ec3f46c9b454a91d4a80d0e0",
       "HlsIngest": {
            "IngestEndpoints": [
                {
                    "Id": "6d345804ec3f46c9b454a91d4a80d0e0",
                    "Password": "generatedwebdavpassword1",
                    "Url": "https://f31c86aed53b815a.mediapackage.us-west-2.amazonaws.com/in/v2/6d345804ec3f46c9b454a91d4a80d0e0/6d345804ec3f46c9b454a91d4a80d0e0/channel",
                    "Username": "generatedwebdavusername1"
                },
                {
                    "Id": "2daa32878af24803b24183727211b8ff",
                    "Password": "generatedwebdavpassword2",
                    "Url": "https://6ebbe7e04c4b0afa.mediapackage.us-west-2.amazonaws.com/in/v2/6d345804ec3f46c9b454a91d4a80d0e0/2daa32878af24803b24183727211b8ff/channel",
                    "Username": "generatedwebdavusername2"
                }
            ]
        },
        "Id": "sportschannel",
        "Tags": {
            "region": "west"
        }
    }                

For more information, see `Creating a Channel <https://docs.aws.amazon.com/mediapackage/latest/ug/channels-create.html>`__ in the *AWS Elemental MediaPackage User Guide*.
