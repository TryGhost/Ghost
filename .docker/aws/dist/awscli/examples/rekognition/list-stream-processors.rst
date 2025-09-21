**To list the stream processors in your account**

The following ``list-stream-processors`` command lists the stream processors in your account and the state of each. ::

    aws rekognition list-stream-processors 

Output::

    {
        "StreamProcessors": [
            {
                "Status": "STOPPED", 
                "Name": "my-stream-processor"
            }
        ]
    }

For more information, see `Working with Streaming Videos <https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html>`__ in the *Amazon Rekognition Developer Guide*.
