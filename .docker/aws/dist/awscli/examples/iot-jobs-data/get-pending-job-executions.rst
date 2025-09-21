**To get a list of all jobs that are not in a terminal status for a thing**

The following ``get-pending-job-executions`` example displays a list of all jobs that aren't in a terminal state for the specified thing. ::

    aws iot-jobs-data get-pending-job-executions \
        --thing-name MotionSensor1 
        --endpoint-url https://1234567890abcd.jobs.iot.us-west-2.amazonaws.com

Output::

    {
        "inProgressJobs": [ 
        ],
        "queuedJobs": [
            { 
                "executionNumber": 2939653338,
                "jobId": "SampleJob",
                "lastUpdatedAt": 1567701875.743,
                "queuedAt": 1567701902.444,
                "versionNumber": 3
          }
        ]
    }

For more information, see `Devices and Jobs <https://docs.aws.amazon.com/iot/latest/developerguide/jobs-devices.html>`__ in the *AWS IoT Developer Guide*.