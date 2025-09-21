**To create an OU in a root or parent OU**

The following example shows how to create an OU that is named AccountingOU: ::

	aws organizations create-organizational-unit --parent-id r-examplerootid111 --name AccountingOU
	
The output includes an organizationalUnit object with details about the new OU: ::

	{
		"OrganizationalUnit": {
			"Id": "ou-examplerootid111-exampleouid111",
			"Arn": "arn:aws:organizations::111111111111:ou/o-exampleorgid/ou-examplerootid111-exampleouid111",
			"Name": "AccountingOU"
		}
	}