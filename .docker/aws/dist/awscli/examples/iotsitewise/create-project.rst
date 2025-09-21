**To create a project**

The following ``create-project`` example creates a wind farm project. ::

    aws iotsitewise create-project \
        --portal-id a1b2c3d4-5678-90ab-cdef-aaaaaEXAMPLE \
        --project-name "Wind Farm 1" \
        --project-description "Contains asset visualizations for Wind Farm #1 for Example Corp."

Output::

    {
        "projectId": "a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE",
        "projectArn": "arn:aws:iotsitewise:us-west-2:123456789012:project/a1b2c3d4-5678-90ab-cdef-eeeeeEXAMPLE"
    }

For more information, see `Creating projects <https://docs.aws.amazon.com/iot-sitewise/latest/appguide/create-projects.html>`__ in the *AWS IoT SiteWise Monitor Application Guide*.