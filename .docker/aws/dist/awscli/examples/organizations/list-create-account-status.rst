**Example 1: To retrieve a list of the account creation requests made in the current organization**

The following example shows how to request a list of account creation requests for an organization that have completed successfully: ::

	aws organizations list-create-account-status --states SUCCEEDED
  
The output includes an array of objects with information about each request. ::

	{
		"CreateAccountStatuses": [
			{
				"AccountId": "444444444444",
				"AccountName": "Developer Test Account",
				"CompletedTimeStamp": 1481835812.143,
				"Id": "car-examplecreateaccountrequestid111",
				"RequestedTimeStamp": 1481829432.531,
				"State": "SUCCEEDED"
			}
		]
	}

**Example 2: To retrieve a list of the in progress account creation requests made in the current organization**

The following example gets a list of in-progress account creation requests for an organization: ::

	aws organizations list-create-account-status --states IN_PROGRESS
  
The output includes an array of objects with information about each request. ::

	{
		"CreateAccountStatuses": [
			{
			  "State": "IN_PROGRESS",
			  "Id": "car-examplecreateaccountrequestid111",
			  "RequestedTimeStamp": 1481829432.531,
			  "AccountName": "Production Account"
			}
		]
	}