**To get information about an application revision**

The following ``get-application-revision`` example displays information about an application revision that is associated with the specified application. ::

    aws deploy get-application-revision \
        --application-name WordPress_App \
        --s3-location bucket=CodeDeployDemoBucket,bundleType=zip,eTag=dd56cfdEXAMPLE8e768f9d77fEXAMPLE,key=WordPressApp.zip

Output::

    {
        "applicationName": "WordPress_App",
        "revisionInfo": {
            "description": "Application revision registered by Deployment ID: d-A1B2C3111",
            "registerTime": 1411076520.009,
            "deploymentGroups": "WordPress_DG",
            "lastUsedTime": 1411076520.009,
            "firstUsedTime": 1411076520.009
        },
        "revision": {
            "revisionType": "S3",
            "s3Location": {
                "bundleType": "zip",
                "eTag": "dd56cfdEXAMPLE8e768f9d77fEXAMPLE",
                "bucket": "CodeDeployDemoBucket",
                "key": "WordPressApp.zip"
            }
        }
    }
