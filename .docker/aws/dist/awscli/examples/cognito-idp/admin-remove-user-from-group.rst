**To remove a user from a group**

This example removes jane@example.com from SampleGroup. 

Command::

  aws cognito-idp admin-remove-user-from-group --user-pool-id us-west-2_aaaaaaaaa --username jane@example.com --group-name SampleGroup
