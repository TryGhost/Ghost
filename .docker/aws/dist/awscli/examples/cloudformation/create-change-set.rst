**To create a change set**

The following ``create-change-set`` example creates a change set with the ``CAPABILITY_IAM`` capability. The file ``template.yaml`` is an AWS CloudFormation template in the current folder that defines a stack that includes IAM resources. ::

    aws cloudformation create-change-set \
        --stack-name my-application \
        --change-set-name my-change-set \
        --template-body file://template.yaml \
        --capabilities CAPABILITY_IAM

Output::

    {
        "Id": "arn:aws:cloudformation:us-west-2:123456789012:changeSet/my-change-set/bc9555ba-a949-xmpl-bfb8-f41d04ec5784",
        "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-application/d0a825a0-e4cd-xmpl-b9fb-061c69e99204"
    }
