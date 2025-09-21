**To delete a hosted configuration version**

The following ``delete-hosted-configuration-version`` example deletes a configuration version hosted in the AWS AppConfig hosted configuration store. ::

    aws appconfig delete-hosted-configuration-version \
        --application-id 339ohji \
        --configuration-profile-id ur8hx2f \
        --version-number 1

Output::
This command produces no output.

For more information, see `Step 3: Creating a configuration and a configuration profile <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html>`__ in the *AWS AppConfig User Guide*.