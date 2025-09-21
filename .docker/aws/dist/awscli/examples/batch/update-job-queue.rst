**To update a job queue**

This example disables a job queue so that it can be deleted.

Command::

  aws batch update-job-queue --job-queue GPGPU --state DISABLED

Output::

	{
	    "jobQueueArn": "arn:aws:batch:us-east-1:012345678910:job-queue/GPGPU",
	    "jobQueueName": "GPGPU"
	}
