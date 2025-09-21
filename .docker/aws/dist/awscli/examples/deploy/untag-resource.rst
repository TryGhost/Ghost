**To remove tags from a resource (application)**

The following ``untag-resource`` example removes two tags with keys Name and Type from an application named testApp in CodeDeploy. ::

    aws deploy untag-resource \
        --resource-arn  arn:aws:codedeploy:us-west-2:111122223333:application:testApp \
        --tag-keys Name Type

If successful, this command produces no output.

For more information, see `Tagging instances for deployment groups in CodeDeploy <https://docs.aws.amazon.com/codedeploy/latest/userguide/instances-tagging.html>`__ in the *AWS CodeDeploy User Guide*.
