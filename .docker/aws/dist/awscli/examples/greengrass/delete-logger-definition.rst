**To delete a logger definition**

The following ``delete-logger-definition`` example deletes the specified logger definition, including all logger definition versions. If you delete a logger definition version that is used by a group version, the group version cannot be deployed successfully. ::

    aws greengrass delete-logger-definition \
        --logger-definition-id "a454b62a-5d56-4ca9-bdc4-8254e1662cb0"

This command produces no output.

For more information, see `Monitoring with AWS IoT Greengrass Logs <https://docs.aws.amazon.com/greengrass/latest/developerguide/greengrass-logs-overview.html>`__ in the *AWS IoT Greengrass Developer Guide*.
