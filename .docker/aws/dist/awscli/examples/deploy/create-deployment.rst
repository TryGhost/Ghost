**Example 1: To create a CodeDeploy deployment using the EC2/On-premises compute platform**

The following ``create-deployment`` example creates a deployment and associates it with the user's AWS account. ::

    aws deploy create-deployment \
        --application-name WordPress_App \
        --deployment-config-name CodeDeployDefault.OneAtATime \
        --deployment-group-name WordPress_DG \
        --description "My demo deployment" \
        --s3-location bucket=CodeDeployDemoBucket,bundleType=zip,eTag=dd56cfdEXAMPLE8e768f9d77fEXAMPLE,key=WordPressApp.zip

Output::

    {
        "deploymentId": "d-A1B2C3111"
    }

**Example 2: To create a CodeDeploy deployment using the Amazon ECS compute platform**

The following ``create-deployment`` example uses the following two files to deploy an Amazon ECS service.

Contents of ``create-deployment.json`` file::

    {
        "applicationName": "ecs-deployment",
        "deploymentGroupName": "ecs-deployment-dg",
        "revision": {
            "revisionType": "S3",
            "s3Location": {
                "bucket": "ecs-deployment-bucket",
                "key": "appspec.yaml",
                "bundleType": "YAML"
            }
        }
    }

That file, in turn, retrieves the following file ``appspec.yaml`` from an S3 bucket called ``ecs-deployment-bucket``. ::

    version: 0.0
    Resources:
      - TargetService:
          Type: AWS::ECS::Service
          Properties:
            TaskDefinition: "arn:aws:ecs:region:123456789012:task-definition/ecs-task-def:2"
            LoadBalancerInfo:
              ContainerName: "sample-app"
              ContainerPort: 80
            PlatformVersion: "LATEST"

Command::

    aws deploy create-deployment \
        --cli-input-json file://create-deployment.json \
        --region us-east-1

Output::

    {
        "deploymentId": "d-1234ABCDE"
    }

For more information, see `CreateDeployment <https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_CreateDeployment.html>`__ in the *AWS CodeDeploy API Reference*.
