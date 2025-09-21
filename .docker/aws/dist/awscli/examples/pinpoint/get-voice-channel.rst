**To retrieve information about the status and settings of the voice channel for an application**

The following ``get-voice-channel`` example retrieves status and settings of the voice channel for an application. ::

    aws pinpoint get-voice-channel \
        --application-id 6e0b7591a90841d2b5d93fa11143e5a7 \
        --region us-east-1

Output::

    {
        "VoiceChannelResponse": {
            "ApplicationId": "6e0b7591a90841d2b5d93fa11143e5a7",
            "CreationDate": "2022-04-28T00:17:03.836Z",
            "Enabled": true,
            "Id": "voice",
            "IsArchived": false,
            "LastModifiedDate": "2022-04-28T00:17:03.836Z",
            "Platform": "VOICE",
            "Version": 1
        }
    }

