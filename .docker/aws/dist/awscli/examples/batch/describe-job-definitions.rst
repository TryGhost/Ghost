**To describe active job definitions**

This example describes all of your active job definitions.

Command::

  aws batch describe-job-definitions --status ACTIVE

Output::

  {
      "jobDefinitions": [
          {
              "status": "ACTIVE",
              "jobDefinitionArn": "arn:aws:batch:us-east-1:012345678910:job-definition/sleep60:1",
              "containerProperties": {
                  "mountPoints": [],
                  "parameters": {},
                  "image": "busybox",
                  "environment": {},
                  "vcpus": 1,
                  "command": [
                      "sleep",
                      "60"
                  ],
                  "volumes": [],
                  "memory": 128,
                  "ulimits": []
              },
              "type": "container",
              "jobDefinitionName": "sleep60",
              "revision": 1
          }
      ]
  }
