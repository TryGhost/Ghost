**To add a custom attribute**

This example adds a custom attribute CustomAttr1 to a user pool. It is a String type,
and requires a minimum of 1 character and a maximum of 15. It is not required.

Command::

  aws cognito-idp add-custom-attributes --user-pool-id us-west-2_aaaaaaaaa --custom-attributes Name="CustomAttr1",AttributeDataType="String",DeveloperOnlyAttribute=false,Required=false,StringAttributeConstraints="{MinLength=1,MaxLength=15}"
