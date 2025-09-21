**To retrieve information about a specified job**

This example returns information about a specified job, including the status of that job if it exists. This is only used for job workers and custom actions. To determine the value of nonce and the job ID, use aws codepipeline poll-for-jobs.

Command::

  aws codepipeline acknowledge-job --job-id f4f4ff82-2d11-EXAMPLE --nonce 3

Output::

  {
    "status": "InProgress"
  }