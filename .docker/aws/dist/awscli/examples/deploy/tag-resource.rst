**To tag a resoure (application)**

The following ``tag-resource`` example adds two tags with keys Name and Type, and values testName and testType to an application named testApp in CodeDeploy.::

    aws deploy tag-resource \
        --resource-arn  arn:aws:codedeploy:us-west-2:111122223333:application:testApp \
        --tags Key=Name,Value=testName Key=Type,Value=testType

If successful, this command produces no output.

For more information, see `Tagging instances for deployment groups in CodeDeploy <https://docs.aws.amazon.com/codedeploy/latest/userguide/instances-tagging.html>`__ in the *AWS CodeDeploy User Guide*.