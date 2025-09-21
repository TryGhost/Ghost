**To view a stack policy**

The following ``get-stack-policy`` example displays the stack policy for the specified stack. To attach a policy to a stack, use the ``set-stack-policy`` command. ::

    aws cloudformation get-stack-policy \
        --stack-name my-stack

Output::

    {
        "StackPolicyBody": "{\n  \"Statement\" : [\n    {\n      \"Effect\" : \"Allow\",\n      \"Action\" : \"Update:*\",\n      \"Principal\": \"*\",\n      \"Resource\" : \"*\"\n    },\n    {\n      \"Effect\" : \"Deny\",\n      \"Action\" : \"Update:*\",\n      \"Principal\": \"*\",\n      \"Resource\" : \"LogicalResourceId/bucket\"\n    }\n  ]\n}\n"
    }
