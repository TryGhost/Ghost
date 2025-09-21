**To assign a tag to a resource**

The following ``tag-resource`` example assigns values for the Department and Area tags to the specified hub resource. ::

    aws securityhub tag-resource \
        --resource-arn "arn:aws:securityhub:us-west-1:123456789012:hub/default" \
        --tags '{"Department":"Operations", "Area":"USMidwest"}'

This command produces no output.

For more information, see `AWS::SecurityHub::Hub <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-securityhub-hub.html>`__ in the *AWS CloudFormation User Guide*.
