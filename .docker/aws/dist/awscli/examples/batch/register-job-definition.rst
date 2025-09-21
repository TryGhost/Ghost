**To register a job definition**

This example registers a job definition for a simple container job.

Command::

  aws batch register-job-definition --job-definition-name sleep30 --type container --container-properties '{ "image": "busybox", "vcpus": 1, "memory": 128, "command": [ "sleep", "30"]}'

Output::

  {
      "jobDefinitionArn": "arn:aws:batch:us-east-1:012345678910:job-definition/sleep30:1",
      "jobDefinitionName": "sleep30",
      "revision": 1
  }
