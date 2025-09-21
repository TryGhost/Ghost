**To disable Detective and delete the behavior graph**

The following ``delete-graph`` example disables Detective and deletes the specified behavior graph. ::

    aws detective delete-graph \
        --graph-arn arn:aws:detective:us-east-1:111122223333:graph:123412341234

This command produces no output.

For more information, see `Disabling Amazon Detective <https://docs.aws.amazon.com/detective/latest/adminguide/detective-disabling.html>`__ in the *Amazon Detective Administration Guide*.
