**To retrieves information about the history and status of each channel for an application**

The following ``get-channels`` example retrieves information about the history and status of each channel for an application. ::

    aws pinpoint get-channels \
        --application-id 6e0b7591a90841d2b5d93fa11143e5a7 \
        --region us-east-1

Output::

    {
        "ChannelsResponse": {
            "Channels": {
                "GCM": {
                    "ApplicationId": "6e0b7591a90841d2b5d93fa11143e5a7",
                    "CreationDate": "2019-10-08T18:28:23.182Z",
                    "Enabled": true,
                    "HasCredential": true,
                    "Id": "gcm",
                    "IsArchived": false,
                    "LastModifiedDate": "2019-10-08T18:28:23.182Z",
                    "Version": 1
                },
                "SMS": {
                    "ApplicationId": "6e0b7591a90841d2b5d93fa11143e5a7",
                    "CreationDate": "2019-10-08T18:39:18.511Z",
                    "Enabled": true,
                    "Id": "sms",
                    "IsArchived": false,
                    "LastModifiedDate": "2019-10-08T18:39:18.511Z",
                    "Version": 1
                },
                "EMAIL": {
                    "ApplicationId": "6e0b7591a90841d2b5d93fa11143e5a7",
                    "CreationDate": "2019-10-08T18:27:23.990Z",
                    "Enabled": true,
                    "Id": "email",
                    "IsArchived": false,
                    "LastModifiedDate": "2019-10-08T18:27:23.990Z",
                    "Version": 1
                },
                "IN_APP": {
                    "Enabled": true,
                    "IsArchived": false,
                    "Version": 0
                }
            }
        }
    }