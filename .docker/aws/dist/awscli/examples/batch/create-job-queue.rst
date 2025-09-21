**To create a low priority job queue with a single compute environment**

This example creates a job queue called `LowPriority` that uses the `M4Spot` compute environment.

Command::

  aws batch create-job-queue --cli-input-json file://<path_to_json_file>/LowPriority.json
  
JSON file format::

  {
    "jobQueueName": "LowPriority",
    "state": "ENABLED",
    "priority": 10,
    "computeEnvironmentOrder": [
      {
        "order": 1,
        "computeEnvironment": "M4Spot"
      }
    ]
  }

Output::

  {
      "jobQueueArn": "arn:aws:batch:us-east-1:012345678910:job-queue/LowPriority",
      "jobQueueName": "LowPriority"
  }

**To create a high priority job queue with two compute environments**

This example creates a job queue called `HighPriority` that uses the `C4OnDemand` compute environment with an order of 1 and the `M4Spot` compute environment with an order of 2. The scheduler will attempt to place jobs on the `C4OnDemand` compute environment first.

Command::

  aws batch create-job-queue --cli-input-json file://<path_to_json_file>/HighPriority.json
  
JSON file format::

  {
    "jobQueueName": "HighPriority",
    "state": "ENABLED",
    "priority": 1,
    "computeEnvironmentOrder": [
      {
        "order": 1,
        "computeEnvironment": "C4OnDemand"
      },
      {
        "order": 2,
        "computeEnvironment": "M4Spot"
      }
    ]
  }

Output::

  {
      "jobQueueArn": "arn:aws:batch:us-east-1:012345678910:job-queue/HighPriority",
      "jobQueueName": "HighPriority"
  }
