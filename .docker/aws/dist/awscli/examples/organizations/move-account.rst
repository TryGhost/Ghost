**To move an account between roots or OUs**

The following example shows you how to move the master account in the organization from the root to an OU: ::

	aws organizations move-account --account-id 333333333333 --source-parent-id r-examplerootid111 --destination-parent-id ou-examplerootid111-exampleouid111