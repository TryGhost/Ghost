**To list tags for a resource (application)**

The following ``list-tags-for-resource`` example lists the tags applied to an application named testApp in CodeDeploy. ::

    aws deploy list-tags-for-resource \
        --resource-arn arn:aws:codedeploy:us-west-2:111122223333:application:testApp

Output::

    {
        "Tags": [
            {
                "Key": "Type",
                "Value": "testType"
            },
            {
                "Key": "Name",
                "Value": "testName"
            }
        ]
    }

For more information, see `Tagging instances for deployment groups in CodeDeploy <https://docs.aws.amazon.com/codedeploy/latest/userguide/instances-tagging.html>`__ in the *AWS CodeDeploy User Guide*.