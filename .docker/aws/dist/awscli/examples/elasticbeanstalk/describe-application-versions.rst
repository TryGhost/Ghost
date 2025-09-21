**To view information about an application version**

The following command retrieves information about an application version labeled ``v2``::

  aws elasticbeanstalk describe-application-versions --application-name my-app --version-label "v2"

Output::

  {
      "ApplicationVersions": [
          {
              "ApplicationName": "my-app",
              "VersionLabel": "v2",
              "Description": "update cover page",
              "DateCreated": "2015-07-23T01:32:26.079Z",
              "DateUpdated": "2015-07-23T01:32:26.079Z",
              "SourceBundle": {
                  "S3Bucket": "elasticbeanstalk-us-west-2-015321684451",
                  "S3Key": "my-app/5026-stage-150723_224258.war"
              }
          },
        {
            "ApplicationName": "my-app",
            "VersionLabel": "v1",
            "Description": "initial version",
            "DateCreated": "2015-07-23T22:26:10.816Z",
            "DateUpdated": "2015-07-23T22:26:10.816Z",
            "SourceBundle": {
                "S3Bucket": "elasticbeanstalk-us-west-2-015321684451",
                "S3Key": "my-app/5026-stage-150723_222618.war"
            }
        }
      ]
  }
