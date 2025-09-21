**To request the runtime configuration for a fleet**

The following ``describe-runtime-configuration`` example retrieves details about the current runtime configuration for a specified fleet. ::

    aws gamelift describe-runtime-configuration \
        --fleet-id fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output:: 

    {
        "RuntimeConfiguration": {
            "ServerProcesses": [
                {
                    "LaunchPath": "C:\game\Bin64.Release.Dedicated\MegaFrogRace_Server.exe",
                    "Parameters": "+gamelift_start_server",
                    "ConcurrentExecutions": 3
                },
                {
                    "LaunchPath": "C:\game\Bin64.Release.Dedicated\MegaFrogRace_Server.exe",
                    "Parameters": "+gamelift_start_server +debug",
                    "ConcurrentExecutions": 1
                }
            ],
            "MaxConcurrentGameSessionActivations": 2147483647,
            "GameSessionActivationTimeoutSeconds": 300
        }
    }

For more information, see `Run Multiple Processes on a Fleet <https://docs.aws.amazon.com/gamelift/latest/developerguide/fleets-multiprocess.html>`__ in the *Amazon GameLift Developer Guide*.
