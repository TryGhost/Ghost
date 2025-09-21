**To create a member account that is automatically part of the organization**

The following example shows how to create a member account in an organization. The member account is configured with the name Production Account and the email address of susan@example.com. Organizations automatically creates an IAM role using the default name of OrganizationAccountAccessRole because the roleName parameter is not specified. Also, the setting that allows IAM users or roles with sufficient permissions to access account billing data is set to the default value of ALLOW because the IamUserAccessToBilling parameter is not specified. Organizations automatically sends Susan a "Welcome to AWS" email: ::

	aws organizations create-account --email susan@example.com --account-name "Production Account"
	
The output includes a request object that shows that the status is now ``IN_PROGRESS``: ::

	{
		"CreateAccountStatus": {
			"State": "IN_PROGRESS",
			"Id": "car-examplecreateaccountrequestid111"
		}
	}

You can later query the current status of the request by providing the Id response value to the describe-create-account-status command as the value for the create-account-request-id parameter.
  
For more information, see `Creating an AWS Account in Your Organization`_ in the *AWS Organizations Users Guide*.

.. _`Creating an AWS Account in Your Organization`: http://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_create.html
