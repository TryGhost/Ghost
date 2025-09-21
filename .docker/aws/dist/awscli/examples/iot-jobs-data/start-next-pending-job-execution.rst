**To get and start the next pending job execution for a thing**

The following ``start-next-pending-job-execution`` example retrieves and starts the next job execution whose status is `IN_PROGRESS` or `QUEUED` for the specified thing. ::

    aws iot-jobs-data start-next-pending-job-execution \
        --thing-name MotionSensor1 
        --endpoint-url https://1234567890abcd.jobs.iot.us-west-2.amazonaws.com

Output::

    {
        "execution": { 
            "approximateSecondsBeforeTimedOut": 88,
            "executionNumber": 2939653338,
            "jobId": "SampleJob",
            "lastUpdatedAt": 1567714853.743,
            "queuedAt": 1567701902.444,
            "startedAt": 1567714871.690,
            "status": "IN_PROGRESS",
            "thingName": "MotionSensor1 ",
            "versionNumber": 3
       }
    }

For more information, see `Devices and Jobs <https://docs.aws.amazon.com/iot/latest/developerguide/jobs-devices.html>`__ in the *AWS IoT Developer Guide*.