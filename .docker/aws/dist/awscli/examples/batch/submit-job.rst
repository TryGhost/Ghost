**To submit a job**

This example submits a simple container job called `example` to the `HighPriority` job queue.

Command::

  aws batch submit-job --job-name example --job-queue HighPriority  --job-definition sleep60

Output::

  {
      "jobName": "example",
      "jobId": "876da822-4198-45f2-a252-6cea32512ea8"
  }
