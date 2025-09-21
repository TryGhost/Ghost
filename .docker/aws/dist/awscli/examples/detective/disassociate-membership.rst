**To resign membership from a behavior graph**

The following `disassociate-membership` example removes the AWS account that runs the command from the behavior graph arn:aws:detective:us-east-1:111122223333:graph:123412341234. ::

    aws detective disassociate-membership \
         --graph-arn arn:aws:detective:us-east-1:111122223333:graph:123412341234

For more information, see `Removing your account from a behavior graph<https://docs.aws.amazon.com/detective/latest/adminguide/member-remove-self-from-graph.html>`__ in the *Amazon Detective Administration Guide*.