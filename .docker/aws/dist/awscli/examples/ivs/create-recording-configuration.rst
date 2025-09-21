**To create a RecordingConfiguration resource**

The following ``create-recording-configuration`` example creates a RecordingConfiguration resource to enable recording to Amazon S3. ::

    aws ivs create-recording-configuration \
        --name "test-recording-config" \
        --recording-reconnect-window-seconds 60 \
        --tags "key1=value1, key2=value2" \
        --rendition-configuration renditionSelection="CUSTOM",renditions="HD" \
        --thumbnail-configuration recordingMode="INTERVAL",targetIntervalSeconds=1,storage="LATEST",resolution="LOWEST_RESOLUTION" \
        --destination-configuration s3={bucketName=demo-recording-bucket}

Output::

    {
        "recordingConfiguration": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:recording-configuration/ABcdef34ghIJ",
            "name": "test-recording-config",
            "destinationConfiguration": {
                "s3": {
                    "bucketName": "demo-recording-bucket"
                }
            },
            "state": "CREATING",
            "tags": {
                "key1": "value1",
                "key2": "value2"
            },
            "thumbnailConfiguration": {
                "recordingMode": "INTERVAL",
                "targetIntervalSeconds": 1,
                "resolution": "LOWEST_RESOLUTION",
                "storage": [
                    "LATEST"
                ]
            },
            "recordingReconnectWindowSeconds": 60,
            "renditionConfiguration": {
                "renditionSelection": "CUSTOM",
                "renditions": [
                    "HD"
                ]
            }
        }
    }

For more information, see `Record to Amazon S3 <https://docs.aws.amazon.com/ivs/latest/userguide/record-to-s3.html>`__ in the *Amazon Interactive Video Service User Guide*.