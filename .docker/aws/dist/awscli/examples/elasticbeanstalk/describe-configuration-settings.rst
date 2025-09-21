**To view configurations settings for an environment**

The following command retrieves configuration settings for an environment named ``my-env``::

  aws elasticbeanstalk describe-configuration-settings --environment-name my-env --application-name my-app

Output (abbreviated)::

  {
      "ConfigurationSettings": [
          {
              "ApplicationName": "my-app",
              "EnvironmentName": "my-env",
              "Description": "Environment created from the EB CLI using \"eb create\"",
              "DeploymentStatus": "deployed",
              "DateCreated": "2015-08-13T19:16:25Z",
              "OptionSettings": [
                  {
                      "OptionName": "Availability Zones",
                      "ResourceName": "AWSEBAutoScalingGroup",
                      "Namespace": "aws:autoscaling:asg",
                      "Value": "Any"
                  },
                  {
                      "OptionName": "Cooldown",
                      "ResourceName": "AWSEBAutoScalingGroup",
                      "Namespace": "aws:autoscaling:asg",
                      "Value": "360"
                  },
                  ...
                  {
                      "OptionName": "ConnectionDrainingTimeout",
                      "ResourceName": "AWSEBLoadBalancer",
                      "Namespace": "aws:elb:policies",
                      "Value": "20"
                  },
                  {
                      "OptionName": "ConnectionSettingIdleTimeout",
                      "ResourceName": "AWSEBLoadBalancer",
                      "Namespace": "aws:elb:policies",
                      "Value": "60"
                  }
              ],
              "DateUpdated": "2015-08-13T23:30:07Z",
              "SolutionStackName": "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8"
          }
      ]
  }

For more information about namespaces and supported options, see `Option Values`_ in the *AWS Elastic Beanstalk Developer Guide*.

.. _`Option Values`: http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options.html
