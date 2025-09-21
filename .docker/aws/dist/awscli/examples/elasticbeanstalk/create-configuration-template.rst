**To create a configuration template**

The following command creates a configuration template named ``my-app-v1`` from the settings applied to an environment with the id ``e-rpqsewtp2j``::

  aws elasticbeanstalk create-configuration-template --application-name my-app --template-name my-app-v1 --environment-id e-rpqsewtp2j

Output::

  {
      "ApplicationName": "my-app",
      "TemplateName": "my-app-v1",
      "DateCreated": "2015-08-12T18:40:39Z",
      "DateUpdated": "2015-08-12T18:40:39Z",
      "SolutionStackName": "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8"
  }
