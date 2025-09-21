**To bundle and deploy an AWS CodeDeploy compatible application revision to Amazon S3**

The following ``push`` example bundles and deploys an application revision to Amazon S3 and then associates the application revision with the specified application. ::

    aws deploy push \
        --application-name WordPress_App \
        --description "This is my deployment" \
        --ignore-hidden-files \
        --s3-location s3://CodeDeployDemoBucket/WordPressApp.zip \
        --source /tmp/MyLocalDeploymentFolder/

The output describes how to use the ``create-deployment`` command to create a deployment that uses the uploaded application revision. ::

    To deploy with this revision, run: 
    aws deploy create-deployment --application-name WordPress_App --deployment-config-name <deployment-config-name> --deployment-group-name <deployment-group-name> --s3-location bucket=CodeDeployDemoBucket,key=WordPressApp.zip,bundleType=zip,eTag="cecc9b8EXAMPLE50a6e71fdb88EXAMPLE",version=LFsJAUdEXAMPLEfvKtvi79L8EXAMPLE