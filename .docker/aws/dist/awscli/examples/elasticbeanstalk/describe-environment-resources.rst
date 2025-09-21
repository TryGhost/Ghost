**To view information about the AWS resources in your environment**

The following command retrieves information about resources in an environment named ``my-env``::

  aws elasticbeanstalk describe-environment-resources --environment-name my-env

Output::

  {
      "EnvironmentResources": {
          "EnvironmentName": "my-env",
          "AutoScalingGroups": [
              {
                  "Name": "awseb-e-qu3fyyjyjs-stack-AWSEBAutoScalingGroup-QSB2ZO88SXZT"
              }
          ],
          "Triggers": [],
          "LoadBalancers": [
              {
                  "Name": "awseb-e-q-AWSEBLoa-1EEPZ0K98BIF0"
              }
          ],
          "Queues": [],
          "Instances": [
              {
                  "Id": "i-0c91c786"
              }
          ],
          "LaunchConfigurations": [
              {
                  "Name": "awseb-e-qu3fyyjyjs-stack-AWSEBAutoScalingLaunchConfiguration-1UUVQIBC96TQ2"
              }
          ]
      }
  }
