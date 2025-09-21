**To get a composition encoder configuration**

The following ``get-encoder-configuration`` example gets the composition encoder configuration specified by the given ARN (Amazon Resource Name). ::

    aws ivs-realtime get-encoder-configuration \
        --arn "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/abcdABCDefgh"

Output::

    {
        "encoderConfiguration": {
            "arn": "arn:aws:ivs:ap-northeast-1:123456789012:encoder-configuration/abcdABCDefgh",
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