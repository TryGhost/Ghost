**To set the user MFA preference**

This example sets the SMS MFA preference for username diego@example.com. 

Command::

  aws cognito-idp admin-set-user-mfa-preference --user-pool-id us-west-2_aaaaaaaaa --username diego@example.com --sms-mfa-settings Enabled=false,PreferredMfa=false
  
