**To provide feedback for an authorization event**

This example sets the feedback value for an authorization event identified by event-id to Valid.

Command::

  aws cognito-idp admin-update-auth-event-feedback --user-pool-id us-west-2_aaaaaaaaa --username diego@example.com --event-id c2c2cf89-c0d3-482d-aba6-99d78a5b0bfe --feedback-value Valid
  
