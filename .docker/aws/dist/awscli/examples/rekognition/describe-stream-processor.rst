**To get information about a stream processor**

The following ``describe-stream-processor`` command displays details about the specified stream processor. ::

    aws rekognition describe-stream-processor \
        --name my-stream-processor 

Output::

    {
        "Status": "STOPPED", 
        "Name": "my-stream-processor", 
        "LastUpdateTimestamp": 1532449292.712, 
        "Settings": {
            "FaceSearch": {
                "FaceMatchThreshold": 80.0, 
                "CollectionId": "my-collection"
            }
        }, 
        "RoleArn": "arn:aws:iam::123456789012:role/AmazonRekognitionDetectStream", 
        "StreamProcessorArn": "arn:aws:rekognition:us-west-2:123456789012:streamprocessor/my-stream-processpr", 
        "Output": {
            "KinesisDataStream": {
                "Arn": "arn:aws:kinesis:us-west-2:123456789012:stream/AmazonRekognitionRekStream"
            }
        }, 
        "Input": {
            "KinesisVideoStream": {
                "Arn": "arn:aws:kinesisvideo:us-west-2:123456789012:stream/macwebcam/123456789012"
            }
        }, 
        "CreationTimestamp": 1532449292.712
    }

For more information, see `Working with Streaming Videos <https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html>`__ in the *Amazon Rekognition Developer Guide*.
