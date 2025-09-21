**To update a pipeline**

The following ``update-pipeline`` example modifies the settings of the specified pipeline. You must specify both a channel and a data store activity and, optionally, as many as 23 additional activities, in the ``pipelineActivities`` array. ::

    aws iotanalytics update-pipeline \
        --cli-input-json file://update-pipeline.json

Contents of update-pipeline.json::

    {
        "pipelineName": "mypipeline",
        "pipelineActivities": [
            {
                "channel": {
                    "name": "myChannelActivity",
                    "channelName": "mychannel",
                    "next": "myMathActivity"
                }
            },
            {
                "datastore": {
                    "name": "myDatastoreActivity",
                    "datastoreName": "mydatastore"
                }
            },
            {
                "math": {
                    "name": "myMathActivity",
                    "math": "(((temp - 32) * 5.0) / 9.0) + 273.15",
                    "attribute": "tempK",
                    "next": "myDatastoreActivity"
                }
            }
        ]
    }

This command produces no output.

For more information, see `UpdatePipeline <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_UpdatePipeline.html>`__ in the *AWS IoT Analytics API Reference*.
