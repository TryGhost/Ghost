**To describe a job queue**

This example describes the `HighPriority` job queue.

Command::

  aws batch describe-job-queues --job-queues HighPriority

Output::

	{
	    "jobQueues": [
	        {
	            "status": "VALID",
	            "jobQueueArn": "arn:aws:batch:us-east-1:012345678910:job-queue/HighPriority",
	            "computeEnvironmentOrder": [
	                {
	                    "computeEnvironment": "arn:aws:batch:us-east-1:012345678910:compute-environment/C4OnDemand",
	                    "order": 1
	                }
	            ],
	            "statusReason": "JobQueue Healthy",
	            "priority": 1,
	            "state": "ENABLED",
	            "jobQueueName": "HighPriority"
	        }
	    ]
	}
