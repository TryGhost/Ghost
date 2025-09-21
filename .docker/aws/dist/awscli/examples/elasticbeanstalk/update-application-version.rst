**To change an application version's description**

The following command updates the description of an application version named ``22a0-stage-150819_185942``::

  aws elasticbeanstalk update-application-version --version-label 22a0-stage-150819_185942 --application-name my-app --description "new description"

Output::

  {
      "ApplicationVersion": {
          "ApplicationName": "my-app",
          "VersionLabel": "22a0-stage-150819_185942",
          "Description": "new description",
          "DateCreated": "2015-08-19T18:59:17.646Z",
          "DateUpdated": "2015-08-20T22:53:28.871Z",
          "SourceBundle": {
              "S3Bucket": "elasticbeanstalk-us-west-2-0123456789012",
              "S3Key": "my-app/22a0-stage-150819_185942.war"
          }
      }
  }