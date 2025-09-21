**To rename an OU**

This example shows you how to rename an OU: In this example, the OU is renamed "AccountingOU": ::

	aws organizations update-organizational-unit --organizational-unit-id ou-examplerootid111-exampleouid111 --name AccountingOU 

The output shows the new name: ::

	{
		"OrganizationalUnit": {
			"Id": "ou-examplerootid111-exampleouid111"
			"Name": "AccountingOU",
			"Arn": "arn:aws:organizations::111111111111:ou/o-exampleorgid/ou-examplerootid111-exampleouid111""
		}
	}