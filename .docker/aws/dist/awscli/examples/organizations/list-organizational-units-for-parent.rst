**To retrieve a list of the OUs in a parent OU or root**

The following example shows you how to get a list of OUs in a specified root: ::

	aws organizations list-organizational-units-for-parent --parent-id r-examplerootid111
  
The output shows that the specified root contains two OUs and shows details of each: ::

	{
		"OrganizationalUnits": [
			{
				"Name": "AccountingDepartment",
				"Arn": "arn:aws:organizations::o-exampleorgid:ou/r-examplerootid111/ou-examplerootid111-exampleouid111"
			},
			{
				"Name": "ProductionDepartment",
				"Arn": "arn:aws:organizations::o-exampleorgid:ou/r-examplerootid111/ou-examplerootid111-exampleouid222"
			}
		]
	}