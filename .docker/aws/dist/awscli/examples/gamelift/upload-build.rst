**Example1: To upload a Linux game server build**

The following ``upload-build`` example uploads Linux game server build files from a file directory to the GameLift service and creates a build resource. ::

    aws gamelift upload-build \
        --name MegaFrogRaceServer.NA \
        --build-version 2.0.1 \
        --build-root ~/MegaFrogRace_Server/release-na \
        --operating-system AMAZON_LINUX_2
        --server-sdk-version 4.0.2

Output::

    Uploading ~/MegaFrogRace_Server/release-na:  16.0 KiB / 74.6 KiB (21.45%)
    Uploading ~/MegaFrogRace_Server/release-na:  32.0 KiB / 74.6 KiB (42.89%)
    Uploading ~/MegaFrogRace_Server/release-na:  48.0 KiB / 74.6 KiB (64.34%)
    Uploading ~/MegaFrogRace_Server/release-na:  64.0 KiB / 74.6 KiB (85.79%)
    Uploading ~/MegaFrogRace_Server/release-na:  74.6 KiB / 74.6 KiB (100.00%)
    Successfully uploaded ~/MegaFrogRace_Server/release-na to AWS GameLift
    Build ID: build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

**Example2: To upload a Windows game server build**

The following ``upload-build`` example uploads Windows game server build files from a directory to the GameLift service and creates a build record. ::

    aws gamelift upload-build \
        --name MegaFrogRaceServer.NA \
        --build-version 2.0.1 \
        --build-root C:\MegaFrogRace_Server\release-na \
        --operating-system WINDOWS_2012
        --server-sdk-version 4.0.2

Output::

    Uploading C:\MegaFrogRace_Server\release-na:  16.0 KiB / 74.6 KiB (21.45%)
    Uploading C:\MegaFrogRace_Server\release-na:  32.0 KiB / 74.6 KiB (42.89%)
    Uploading C:\MegaFrogRace_Server\release-na:  48.0 KiB / 74.6 KiB (64.34%)
    Uploading C:\MegaFrogRace_Server\release-na:  64.0 KiB / 74.6 KiB (85.79%)
    Uploading C:\MegaFrogRace_Server\release-na:  74.6 KiB / 74.6 KiB (100.00%)
    Successfully uploaded C:\MegaFrogRace_Server\release-na to AWS GameLift
    Build ID: build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

For more information, see `Upload a Custom Server Build to GameLift <https://docs.aws.amazon.com/gamelift/latest/developerguide/gamelift-build-cli-uploading.html>`__ in the *Amazon GameLift Developer Guide*.
