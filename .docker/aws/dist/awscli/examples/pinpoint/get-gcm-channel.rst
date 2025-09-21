**To retrieve information about the status and settings of the GCM channel for an application**

The following ``get-gcm-channel`` example retrieves information about the status and settings of the GCM channel for an application. ::

    aws pinpoint get-gcm-channel \
        --application-id 6e0b7591a90841d2b5d93fa11143e5a7 \
        --region us-east-1

Output::

    {
        "GCMChannelResponse": {
            "ApplicationId": "6e0b7591a90841d2b5d93fa11143e5a7",
            "CreationDate": "2019-10-08T18:28:23.182Z",
            "Enabled": true,
            "HasCredential": true,
            "Id": "gcm",
            "IsArchived": false,
            "LastModifiedDate": "2019-10-08T18:28:23.182Z",
            "Platform": "GCM",
            "Version": 1
        }
    }