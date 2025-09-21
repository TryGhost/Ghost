**To retrieve tailed logs**

The following command retrieves a link to logs from an environment named ``my-env``::

  aws elasticbeanstalk retrieve-environment-info --environment-name my-env --info-type tail

Output::

  {
      "EnvironmentInfo": [
          {
              "SampleTimestamp": "2015-08-20T22:23:17.703Z",
              "Message": "https://elasticbeanstalk-us-west-2-0123456789012.s3.amazonaws.com/resources/environments/logs/tail/e-fyqyju3yjs/i-09c1c867/TailLogs-1440109397703.out?AWSAccessKeyId=AKGPT4J56IAJ2EUBL5CQ&Expires=1440195891&Signature=n%2BEalOV6A2HIOx4Rcfb7LT16bBM%3D",
              "InfoType": "tail",
              "Ec2InstanceId": "i-09c1c867"
          }
      ]
  }

View the link in a browser. Prior to retrieval, logs must be requested with `request-environment-info`_.

.. _`request-environment-info`: http://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/retrieve-environment-info.html
  