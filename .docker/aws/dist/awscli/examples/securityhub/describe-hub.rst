**To get information about a hub resource**

The following ``describe-hub`` example returns the subscription date for the specified hub resource. The hub resource is identified by its ARN. ::

    aws securityhub describe-hub \
        --hub-arn "arn:aws:securityhub:us-west-1:123456789012:hub/default"

Output::

    {
        "HubArn": "arn:aws:securityhub:us-west-1:123456789012:hub/default",
        "SubscribedAt": "2019-11-19T23:15:10.046Z"
    }

For more information, see `AWS::SecurityHub::Hub <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-securityhub-hub.html>`__ in the *AWS CloudFormation User Guide*.
