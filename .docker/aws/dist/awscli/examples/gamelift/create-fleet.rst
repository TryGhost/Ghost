**Example 1: To create a basic Linux fleet**

The following ``create-fleet`` example creates a minimally configured fleet of on-demand Linux instances to host a custom server build. You can complete the configuration by using ``update-fleet``. ::

    aws gamelift create-fleet \
        --name MegaFrogRaceServer.NA.v2 \
        --description 'Hosts for v2 North America' \
        --build-id build-1111aaaa-22bb-33cc-44dd-5555eeee66ff \
        --certificate-configuration 'CertificateType=GENERATED' \
        --ec2-instance-type c4.large \
        --fleet-type ON_DEMAND \
        --runtime-configuration 'ServerProcesses=[{LaunchPath=/local/game/release-na/MegaFrogRace_Server.exe,ConcurrentExecutions=1}]'

Output::

    {
        "FleetAttributes": {
            "BuildId": "build-1111aaaa-22bb-33cc-44dd-5555eeee66ff", 
            "CertificateConfiguration": { 
                "CertificateType": "GENERATED"
            },
            "CreationTime": 1496365885.44, 
            "Description": "Hosts for v2 North America",
            "FleetArn": "arn:aws:gamelift:us-west-2:444455556666:fleet/fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa", 
            "FleetId": "fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa", 
            "FleetType": "ON_DEMAND",
            "InstanceType": "c4.large",
            "MetricGroups": ["default"],
            "Name": "MegaFrogRace.NA.v2", 
            "NewGameSessionProtectionPolicy": "NoProtection", 
            "OperatingSystem": "AMAZON_LINUX", 
            "ServerLaunchPath": "/local/game/release-na/MegaFrogRace_Server.exe",
            "Status": "NEW"
        }
    }

**Example 2: To create a basic Windows fleet**

The following ``create-fleet`` example creates a minimally configured fleet of spot Windows instances to host a custom server build. You can complete the configuration by using ``update-fleet``. ::

    aws gamelift create-fleet \
        --name MegaFrogRace.NA.v2 \
        --description 'Hosts for v2 North America' \
        --build-id build-2222aaaa-33bb-44cc-55dd-6666eeee77ff  \
        --certificate-configuration 'CertificateType=GENERATED' \
        --ec2-instance-type c4.large \
        --fleet-type SPOT \
        --runtime-configuration 'ServerProcesses=[{LaunchPath=C:\game\Bin64.Release.Dedicated\MegaFrogRace_Server.exe,ConcurrentExecutions=1}]'

Output::

    {
        "FleetAttributes": {
            "BuildId": "build-2222aaaa-33bb-44cc-55dd-6666eeee77ff", 
            "CertificateConfiguration": { 
                "CertificateType": "GENERATED"
            },
            "CreationTime": 1496365885.44, 
            "Description": "Hosts for v2 North America",
            "FleetArn": "arn:aws:gamelift:us-west-2:444455556666:fleet/fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa", 
            "FleetId": "fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa", 
            "FleetType": "SPOT",
            "InstanceType": "c4.large",
            "MetricGroups": ["default"],
            "Name": "MegaFrogRace.NA.v2", 
            "NewGameSessionProtectionPolicy": "NoProtection", 
            "OperatingSystem": "WINDOWS_2012", 
            "ServerLaunchPath": "C:\game\Bin64.Release.Dedicated\MegaFrogRace_Server.exe",
            "Status": "NEW"
        }
    }


**Example 3: To create a fully configured fleet**

The following ``create-fleet`` example creates a fleet of Spot Windows instances for a custom server build, with most commonly used configuration settings provided. :: 

    aws gamelift create-fleet \
        --name MegaFrogRace.NA.v2 \
        --description 'Hosts for v2 North America' \
        --build-id build-2222aaaa-33bb-44cc-55dd-6666eeee77ff \
        --certificate-configuration 'CertificateType=GENERATED' \
        --ec2-instance-type c4.large \
        --ec2-inbound-permissions 'FromPort=33435,ToPort=33435,IpRange=10.24.34.0/23,Protocol=UDP' \
        --fleet-type SPOT \
        --new-game-session-protection-policy FullProtection \
        --runtime-configuration file://runtime-config.json \
        --metric-groups default \
        --instance-role-arn 'arn:aws:iam::444455556666:role/GameLiftS3Access'

Contents of ``runtime-config.json``::

  GameSessionActivationTimeoutSeconds=300,
   MaxConcurrentGameSessionActivations=2,
   ServerProcesses=[
     {LaunchPath=C:\game\Bin64.Release.Dedicated\MegaFrogRace_Server.exe,Parameters=-debug,ConcurrentExecutions=1},
     {LaunchPath=C:\game\Bin64.Release.Dedicated\MegaFrogRace_Server.exe,ConcurrentExecutions=1}]

Output::

    {
        "FleetAttributes": {
            "InstanceRoleArn": "arn:aws:iam::444455556666:role/GameLiftS3Access",
            "Status": "NEW",
            "InstanceType": "c4.large",
            "FleetArn": "arn:aws:gamelift:us-west-2:444455556666:fleet/fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa",
            "FleetId": "fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa",
            "Description": "Hosts for v2 North America",
            "FleetType": "SPOT",
            "OperatingSystem": "WINDOWS_2012",
            "Name": "MegaFrogRace.NA.v2",
            "CreationTime": 1569309011.11,
            "MetricGroups": [
                "default"
            ],
            "BuildId": "build-2222aaaa-33bb-44cc-55dd-6666eeee77ff",
            "ServerLaunchParameters": "abc",
            "ServerLaunchPath": "C:\\game\\Bin64.Release.Dedicated\\MegaFrogRace_Server.exe",
            "NewGameSessionProtectionPolicy": "FullProtection",
            "CertificateConfiguration": {
                "CertificateType": "GENERATED"
            }
        }
    }

**Example 4: To create a Realtime Servers fleet**

The following ``create-fleet`` example creates a fleet of Spot instances with a Realtime configuration script that has been uploaded to Amazon GameLift. All Realtime servers are deployed onto Linux machines. For the purposes of this example, assume that the uploaded Realtime script includes multiple script files, with the ``Init()`` function located in the script file called ``MainScript.js``. As shown, this file is identified as the launch script in the runtime configuration. ::

    aws gamelift create-fleet \
        --name MegaFrogRace.NA.realtime \
        --description 'Mega Frog Race Realtime fleet' \
        --script-id script-1111aaaa-22bb-33cc-44dd-5555eeee66ff \
        --ec2-instance-type c4.large \
        --fleet-type SPOT \
        --certificate-configuration 'CertificateType=GENERATED' --runtime-configuration 'ServerProcesses=[{LaunchPath=/local/game/MainScript.js,Parameters=+map Winter444,ConcurrentExecutions=5}]'

Output::

    {
        "FleetAttributes": {
            "FleetId": "fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa",
            "Status": "NEW",
            "CreationTime": 1569310745.212,
            "InstanceType": "c4.large",
            "NewGameSessionProtectionPolicy": "NoProtection",
            "CertificateConfiguration": {
                "CertificateType": "GENERATED"
            },
            "Name": "MegaFrogRace.NA.realtime",
            "ScriptId": "script-1111aaaa-22bb-33cc-44dd-5555eeee66ff",
            "FleetArn": "arn:aws:gamelift:us-west-2:444455556666:fleet/fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa",
            "FleetType": "SPOT",
            "MetricGroups": [
                "default"
            ],
            "Description": "Mega Frog Race Realtime fleet",
            "OperatingSystem": "AMAZON_LINUX"
        }
    }
