**To get the details of a job execution**

The following ``describe-job-execution`` example retrieves the details of the latest execution of the specified job and thing. ::

    aws iot-jobs-data describe-job-execution \
        --job-id SampleJob \
        --thing-name MotionSensor1 \
        --endpoint-url https://1234567890abcd.jobs.iot.us-west-2.amazonaws.com

Output::

    {
        "execution": { 
            "approximateSecondsBeforeTimedOut": 88,
            "executionNumber": 2939653338,
            "jobId": "SampleJob",
            "lastUpdatedAt": 1567701875.743,
            "queuedAt": 1567701902.444,
            "status": "QUEUED",
            "thingName": "MotionSensor1 ",
            "versionNumber": 3
       }
    }

For more information, see `Devices and Jobs <https://docs.aws.amazon.com/iot/latest/developerguide/jobs-devices.html>`__ in the *AWS IoT Developer Guide*.