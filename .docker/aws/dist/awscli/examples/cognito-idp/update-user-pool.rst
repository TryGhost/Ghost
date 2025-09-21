**To update a user pool**

The following ``update-user-pool`` example modifies a user pool with example syntax for each of the available configuration options. To update a user pool, you must specify all previously-configured options or they will reset to a default value. ::

    aws cognito-idp update-user-pool --user-pool-id us-west-2_EXAMPLE \
        --policies PasswordPolicy=\{MinimumLength=6,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true,TemporaryPasswordValidityDays=7\} \
        --deletion-protection ACTIVE \
        --lambda-config PreSignUp="arn:aws:lambda:us-west-2:123456789012:function:cognito-test-presignup-function",PreTokenGeneration="arn:aws:lambda:us-west-2:123456789012:function:cognito-test-pretoken-function" \
        --auto-verified-attributes "phone_number" "email" \
        --verification-message-template \{\"SmsMessage\":\""Your code is {####}"\",\"EmailMessage\":\""Your code is {####}"\",\"EmailSubject\":\""Your verification code"\",\"EmailMessageByLink\":\""Click {##here##} to verify your email address."\",\"EmailSubjectByLink\":\""Your verification link"\",\"DefaultEmailOption\":\"CONFIRM_WITH_LINK\"\} \
        --sms-authentication-message "Your code is {####}" \
        --user-attribute-update-settings AttributesRequireVerificationBeforeUpdate="email","phone_number" \
        --mfa-configuration "OPTIONAL" \
        --device-configuration ChallengeRequiredOnNewDevice=true,DeviceOnlyRememberedOnUserPrompt=true \
        --email-configuration SourceArn="arn:aws:ses:us-west-2:123456789012:identity/admin@example.com",ReplyToEmailAddress="amdin+noreply@example.com",EmailSendingAccount=DEVELOPER,From="admin@amazon.com",ConfigurationSet="test-configuration-set" \
        --sms-configuration SnsCallerArn="arn:aws:iam::123456789012:role/service-role/SNS-SMS-Role",ExternalId="12345",SnsRegion="us-west-2" \
        --admin-create-user-config AllowAdminCreateUserOnly=false,InviteMessageTemplate=\{SMSMessage=\""Welcome {username}. Your confirmation code is {####}"\",EmailMessage=\""Welcome {username}. Your confirmation code is {####}"\",EmailSubject=\""Welcome to MyMobileGame"\"\} \
        --user-pool-tags "Function"="MyMobileGame","Developers"="Berlin" \
        --admin-create-user-config AllowAdminCreateUserOnly=false,InviteMessageTemplate=\{SMSMessage=\""Welcome {username}. Your confirmation code is {####}"\",EmailMessage=\""Welcome {username}. Your confirmation code is {####}"\",EmailSubject=\""Welcome to MyMobileGame"\"\} \
        --user-pool-add-ons AdvancedSecurityMode="AUDIT" \
        --account-recovery-setting RecoveryMechanisms=\[\{Priority=1,Name="verified_email"\},\{Priority=2,Name="verified_phone_number"\}\]

This command produces no output.

For more information, see `Updating user pool configuration <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-updating.html>`__ in the *Amazon Cognito Developer Guide*.