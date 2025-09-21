**To delete a user pool domain**

The following ``delete-user-pool-domain`` example deletes a user pool domain named ``my-domain`` ::

    aws cognito-idp delete-user-pool-domain \
        --user-pool-id us-west-2_aaaaaaaaa \
        --domain my-domain
