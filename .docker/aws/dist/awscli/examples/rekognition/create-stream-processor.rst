**To create a new stream processor**

The following ``create-stream-processor`` example creates a new stream processor with the specified configuration. ::

    aws rekognition create-stream-processor --name my-stream-processor\
        --input '{"KinesisVideoStream":{"Arn":"arn:aws:kinesisvideo:us-west-2:123456789012:stream/macwebcam/1530559711205"}}'\
        --stream-processor-output '{"KinesisDataStream":{"Arn":"arn:aws:kinesis:us-west-2:123456789012:stream/AmazonRekognitionRekStream"}}'\
        --role-arn arn:aws:iam::123456789012:role/AmazonRekognitionDetect\
        --settings '{"FaceSearch":{"CollectionId":"MyCollection","FaceMatchThreshold":85.5}}'

Output::

    {
        "StreamProcessorArn": "arn:aws:rekognition:us-west-2:123456789012:streamprocessor/my-stream-processor"
    }

For more information, see `Working with Streaming Videos <https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video.html>`__ in the *Amazon Rekognition Developer Guide*.
