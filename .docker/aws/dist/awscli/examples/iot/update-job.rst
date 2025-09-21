**To get detailed status for a job**

The following ``update-job`` example gets detailed status for the job whose ID is ``example-job-01``. ::

    aws iot describe-job \
        --job-id "example-job-01"
        
Output::

   {
       "job": {
           "jobArn": "arn:aws:iot:us-west-2:123456789012:job/example-job-01",
           "jobId": "example-job-01",
           "targetSelection": "SNAPSHOT",
           "status": "IN_PROGRESS",
           "targets": [
               "arn:aws:iot:us-west-2:123456789012:thing/MyRaspberryPi"
           ],
           "description": "example job test",
           "presignedUrlConfig": {},
           "jobExecutionsRolloutConfig": {},
           "createdAt": 1560787022.733,
           "lastUpdatedAt": 1560787026.294,
           "jobProcessDetails": {
               "numberOfCanceledThings": 0,
               "numberOfSucceededThings": 0,
               "numberOfFailedThings": 0,
               "numberOfRejectedThings": 0,
               "numberOfQueuedThings": 1,
               "numberOfInProgressThings": 0,
               "numberOfRemovedThings": 0,
               "numberOfTimedOutThings": 0
           },
           "timeoutConfig": {}
       }
   }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
