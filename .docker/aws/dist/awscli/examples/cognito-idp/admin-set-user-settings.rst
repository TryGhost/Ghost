**To set user settings**

This example sets the MFA delivery preference for username diego@example.com to EMAIL. 

Command::

  aws cognito-idp admin-set-user-settings --user-pool-id us-west-2_aaaaaaaaa --username diego@example.com --mfa-options DeliveryMedium=EMAIL
  
