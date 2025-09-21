**To list running jobs**

This example lists the running jobs in the `HighPriority` job queue.

Command::

  aws batch list-jobs --job-queue HighPriority

Output::

  {
      "jobSummaryList": [
          {
              "jobName": "example",
              "jobId": "e66ff5fd-a1ff-4640-b1a2-0b0a142f49bb"
          }
      ]
  }


**To list submitted jobs**

This example lists jobs in the `HighPriority` job queue that are in the `SUBMITTED` job status.

Command::

  aws batch list-jobs --job-queue HighPriority --job-status SUBMITTED

Output::

  {
      "jobSummaryList": [
          {
              "jobName": "example",
              "jobId": "68f0c163-fbd4-44e6-9fd1-25b14a434786"
          }
      ]
  }
  