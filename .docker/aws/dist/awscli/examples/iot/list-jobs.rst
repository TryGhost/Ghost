**To list the jobs in your AWS account**

The following ``list-jobs`` example lists all jobs in your AWS account, sorted by the job status. ::

    aws iot list-jobs

Output::

   {
       "jobs": [
           {
               "jobArn": "arn:aws:iot:us-west-2:123456789012:job/example-job-01",
               "jobId": "example-job-01",
               "targetSelection": "SNAPSHOT",
               "status": "IN_PROGRESS",
               "createdAt": 1560787022.733,
               "lastUpdatedAt": 1560787026.294
           }
       ]
   }

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
