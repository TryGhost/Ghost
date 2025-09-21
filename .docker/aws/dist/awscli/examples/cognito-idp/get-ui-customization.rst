**To display the classic hosted UI customization settings for an app client**

The following ``get-ui-customization`` example displays the classic hosted UI customization settings for an app client that doesn't inherit settings from the user pool. ::

    aws cognito-idp get-ui-customization \
        --user-pool-id us-west-2_EXAMPLE \
        --client-id 1example23456789


Output::

    {
        "UICustomization": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "ClientId": "1example23456789",
            "ImageUrl": "https://example.cloudfront.net/us-west-2_EXAMPLE/1example23456789/20250115191928/assets/images/image.jpg",
            "CSS": "\n.logo-customizable {\n  max-width: 80%;\n  max-height: 30%;\n}\n\n.banner-customizable {\n  padding: 25px 0px 25px 0px;\n  background-color: lightgray;\n}\n\n.label-customizable {\n  font-weight: 400;\n}\n\n.textDescription-customizable {\n  padding-top: 100px;\n  padding-bottom: 10px;\n  display: block;\n  font-size: 12px;\n}\n\n.idpDescription-customizable {\n  padding-top: 10px;\n  padding-bottom: 10px;\n  display: block;\n  font-size: 16px;\n}\n\n.legalText-customizable {\n  color: #747474;\n  font-size: 11px;\n}\n\n.submitButton-customizable {\n  font-size: 14px;\n  font-weight: bold;\n  margin: 20px 0px 10px 0px;\n  height: 50px;\n  width: 100%;\n  color: #fff;\n  background-color: #337ab7;\n}\n\n.submitButton-customizable:hover {\n  color: #fff;\n  background-color: #286090;\n}\n\n.errorMessage-customizable {\n  padding: 5px;\n  font-size: 12px;\n  width: 100%;\n  background: #F5F5F5;\n  border: 2px solid #D64958;\n  color: #D64958;\n}\n\n.inputField-customizable {\n  width: 100%;\n  height: 34px;\n  color: #555;\n  background-color: #fff;\n  border: 1px solid #ccc;\n}\n\n.inputField-customizable:focus {\n  border-color: #66afe9;\n  outline: 0;\n}\n\n.idpButton-customizable {\n  height: 40px;\n  width: 100%;\n  width: 100%;\n  text-align: center;\n  margin-bottom: 15px;\n  color: #fff;\n  background-color: #5bc0de;\n  border-color: #46b8da;\n}\n\n.idpButton-customizable:hover {\n  color: #fff;\n  background-color: #31b0d5;\n}\n\n.socialButton-customizable {\n  border-radius: 2px;\n  height: 60px;\n  margin-bottom: 15px;\n  padding: 1px;\n  text-align: left;\n  width: 100%;\n}\n\n.redirect-customizable {\n  text-align: center;\n}\n\n.passwordCheck-notValid-customizable {\n  color: #DF3312;\n}\n\n.passwordCheck-valid-customizable {\n  color: #19BF00;\n}\n\n.background-customizable {\n  background-color: #fff;\n}\n",
            "CSSVersion": "20250115191928"
        }
    }

For more information, see `Hosted UI (classic) branding <https://docs.aws.amazon.com/cognito/latest/developerguide/hosted-ui-classic-branding.html>`__ in the *Amazon Cognito Developer Guide*.
