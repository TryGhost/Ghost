**To validate a configuration**

The following ``validate-configuration`` example uses the validators in a configuration profile to validate a configuration. ::

    aws appconfig validate-configuration \
        --application-id abc1234 \
        --configuration-profile-id ur8hx2f \
        --configuration-version 1

The command produces no output.

For more information, see `Step 3: Creating a configuration and a configuration profile <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html>`__ in the *AWS AppConfig User Guide*.