**To create a composition encoder configuration**

The following ``create-encoder-configuration`` example creates a composition encoder configuration with the specified properties. ::

    aws ivs-realtime create-encoder-configuration \
        --name test-ec --video bitrate=3500000,framerate=30.0,height=1080,width=1920

Output::

    {
        "encoderConfiguration": {
            "arn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/ABabCDcdEFef",
            "name": "test-ec",
            "tags": {},
            "video": {
                "bitrate": 3500000,
                "framerate": 30,
                "height": 1080,
                "width": 1920
            }
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.