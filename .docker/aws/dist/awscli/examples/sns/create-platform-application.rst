**To create a platform application**

The following ``create-platform-application`` example creates a Google Firebase platform application using the specified platform credential. ::

    aws sns create-platform-application \
        --name MyApplication \
        --platform GCM \
        --attributes PlatformCredential=EXAMPLEabcd12345jklm67890stuv12345bcdef

Output::

    {
        "PlatformApplicationArn": "arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication"
    }
