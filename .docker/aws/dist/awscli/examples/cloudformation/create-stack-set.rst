**To create a stack set**

The following ``create-stack-set`` example creates a stack set using the specified YAML file temlplate. ``template.yaml`` is an AWS CloudFormation template in the current folder that defines a stack. ::

    aws cloudformation create-stack-set \
        --stack-set-name my-stack-set \
        --template-body file://template.yaml \
        --description "SNS topic"

Output::

    {
        "StackSetId": "my-stack-set:8d0f160b-d157-xmpl-a8e6-c0ce8e5d8cc1"
    }

To add stack instances to the stack set, use the ``create-stack-instances`` command.