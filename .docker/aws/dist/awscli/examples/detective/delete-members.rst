**To remove member accounts from a behavior graph**

The following ``delete-members`` example removes two member accounts from the behavior graph arn:aws:detective:us-east-1:111122223333:graph:123412341234. To identify the accounts, the request provides the AWS account IDs. ::

    aws detective delete-members \
        --account-ids 444455556666 123456789012 \
        --graph-arn arn:aws:detective:us-east-1:111122223333:graph:123412341234

Output::

    {
       "AccountIds": [ "444455556666", "123456789012" ],
       "UnprocessedAccounts": [ ]
   }

For more information, see `Removing member accounts from a behavior graph<https://docs.aws.amazon.com/detective/latest/adminguide/graph-admin-remove-member-accounts.html>`__ in the *Amazon Detective Administration Guide*.