**To get the Android SDK for a REST API stage**

Command::

  aws apigateway get-sdk --rest-api-id 1234123412 --stage-name dev --sdk-type android --parameters groupId='com.mycompany',invokerPackage='com.mycompany.clientsdk',artifactId='Mycompany-client',artifactVersion='1.0.0' /path/to/android_sdk.zip

Output::

  {
      "contentType": "application/octet-stream", 
      "contentDisposition": "attachment; filename=\"android_2016-02-22_23-52Z.zip\""
  }

**To get the IOS SDK for a REST API stage**

Command::

  aws apigateway get-sdk --rest-api-id 1234123412 --stage-name dev --sdk-type objectivec --parameters classPrefix='myprefix' /path/to/iOS_sdk.zip

Output::

  {
      "contentType": "application/octet-stream", 
      "contentDisposition": "attachment; filename=\"objectivec_2016-02-22_23-52Z.zip\""
  }

**To get the Javascript SDK for a REST API stage**

Command::

  aws apigateway get-sdk --rest-api-id 1234123412 --stage-name dev --sdk-type javascript /path/to/javascript_sdk.zip

Output::

  {
      "contentType": "application/octet-stream", 
      "contentDisposition": "attachment; filename=\"javascript_2016-02-22_23-52Z.zip\""
  }

