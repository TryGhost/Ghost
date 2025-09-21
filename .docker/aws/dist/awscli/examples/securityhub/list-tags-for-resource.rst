**To retrieve the tags assigned to a resource**

The following ``list-tags-for-resource`` example returns the tags assigned to the specified hub resource. ::

    aws securityhub list-tags-for-resource \
        --resource-arn "arn:aws:securityhub:us-west-1:123456789012:hub/default"

Output::

    {
        "Tags": { 
            "Department" : "Operations",
            "Area" : "USMidwest"
        }
    }

For more information, see `AWS::SecurityHub::Hub <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-securityhub-hub.html>`__ in the *AWS CloudFormation User Guide*.
