**To delete a provisioned concurrency configuration**

The following ``delete-provisioned-concurrency-config`` example deletes the provisioned concurrency configuration for the ``GREEN`` alias of the specified function. ::

    aws lambda delete-provisioned-concurrency-config \
        --function-name my-function \
        --qualifier GREEN
