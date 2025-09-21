**To batch describe simulation jobs**

The following ``batch-describe-simulation-job`` example retrieves details for the three specified simulation jobs. 

Command::

    aws robomaker batch-describe-simulation-job \
    --job arn:aws:robomaker:us-west-2:111111111111:simulation-job/sim-66bbb3gpxm8x arn:aws:robomaker:us-west-2:111111111111:simulation-job/sim-p0cpdrrwng2n arn:aws:robomaker:us-west-2:111111111111:simulation-job/sim-g8h6tglmblgw

Output::

    {
        "jobs": [
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-job/sim-66bbb3gpxm8x",
                "status": "Completed",
                "lastUpdatedAt": 1548959178.0,
                "failureBehavior": "Continue",
                "clientRequestToken": "6020408e-b05c-4310-9f13-4ed71c5221ed",
                "outputLocation": {
                    "s3Bucket": "awsrobomakerobjecttracker-111111111-bundlesbucket-2lk584kiq1oa",
                    "s3Prefix": "output"
                },
                "maxJobDurationInSeconds": 3600,
                "simulationTimeMillis": 0,
                "iamRole": "arn:aws:iam::111111111111:role/AWSRoboMakerObjectTracker-154895-SimulationJobRole-14D5ASA7PQE3A",
                "simulationApplications": [
                    {
                        "application": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/AWSRoboMakerObjectTracker-1548959046124_NPvyfcatq/1548959170096",
                        "applicationVersion": "$LATEST",
                        "launchConfig": {
                            "packageName": "object_tracker_simulation",
                            "launchFile": "local_training.launch",
                            "environmentVariables": {
                                "MARKOV_PRESET_FILE": "object_tracker.py",
                                "MODEL_S3_BUCKET": "awsrobomakerobjecttracker-111111111-bundlesbucket-2lk584kiq1oa",
                                "MODEL_S3_PREFIX": "model-store",
                                "ROS_AWS_REGION": "us-west-2"
                            }
                        }
                    }
                ],
                "tags": {},
                "vpcConfig": {
                    "subnets": [
                        "subnet-716dd52a",
                        "subnet-43c22325",
                        "subnet-3f526976"
                    ],
                    "securityGroups": [
                        "sg-3fb40545"
                    ],
                    "vpcId": "vpc-99895eff",
                    "assignPublicIp": true
                }
            },
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-job/sim-p0cpdrrwng2n",
                "status": "Completed",
                "lastUpdatedAt": 1548168817.0,
                "failureBehavior": "Continue",
                "clientRequestToken": "e4a23e75-f9a7-411d-835f-21881c82c58b",
                "outputLocation": {
                    "s3Bucket": "awsrobomakercloudwatch-111111111111-bundlesbucket-14e5s9jvwtmv7",
                    "s3Prefix": "output"
                },
                "maxJobDurationInSeconds": 3600,
                "simulationTimeMillis": 0,
                "iamRole": "arn:aws:iam::111111111111:role/AWSRoboMakerCloudWatch-154766341-SimulationJobRole-G0OBWTQ8YBG6",
                "robotApplications": [
                    {
                        "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/AWSRoboMakerCloudWatch-1547663411642_NZbpqEJ3T/1547663517377",
                        "applicationVersion": "$LATEST",
                        "launchConfig": {
                            "packageName": "cloudwatch_robot",
                            "launchFile": "await_commands.launch",
                            "environmentVariables": {
                                "LAUNCH_ID": "1548168752173",
                                "ROS_AWS_REGION": "us-west-2"
                            }
                        }
                    }
                ],
                "simulationApplications": [
                    {
                        "application": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/AWSRoboMakerCloudWatch-1547663411642_0LIt6D1h6/1547663521470",
                        "applicationVersion": "$LATEST",
                        "launchConfig": {
                            "packageName": "cloudwatch_simulation",
                            "launchFile": "bookstore_turtlebot_navigation.launch",
                            "environmentVariables": {
                                "LAUNCH_ID": "1548168752173",
                                "ROS_AWS_REGION": "us-west-2",
                                "TURTLEBOT3_MODEL": "waffle_pi"
                            }
                        }
                    }
                ],
                "tags": {},
                "vpcConfig": {
                    "subnets": [
                        "subnet-716dd52a",
                        "subnet-43c22325",
                        "subnet-3f526976"
                    ],
                    "securityGroups": [
                        "sg-3fb40545"
                    ],
                    "vpcId": "vpc-99895eff",
                    "assignPublicIp": true
                }
            },
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-job/sim-g8h6tglmblgw",
                "status": "Canceled",
                "lastUpdatedAt": 1546543442.0,
                "failureBehavior": "Fail",
                "clientRequestToken": "d796bbb4-2a2c-1abc-f2a9-0d9e547d853f",
                "outputLocation": {
                    "s3Bucket": "sample-bucket",
                    "s3Prefix": "SimulationLog_115490482698"
                },
                "maxJobDurationInSeconds": 28800,
                "simulationTimeMillis": 0,
                "iamRole": "arn:aws:iam::111111111111:role/RoboMakerSampleTheFirst",
                "robotApplications": [
                    {
                        "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/RoboMakerHelloWorldRobot/1546541208251",
                        "applicationVersion": "$LATEST",
                        "launchConfig": {
                            "packageName": "hello_world_robot",
                            "launchFile": "rotate.launch"
                        }
                    }
                ],
                "simulationApplications": [
                    {
                        "application": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/RoboMakerHelloWorldSimulation/1546541198985",
                        "applicationVersion": "$LATEST",
                        "launchConfig": {
                            "packageName": "hello_world_simulation",
                            "launchFile": "empty_world.launch"
                        }
                    }
                ],
                "tags": {}
            }
        ],
        "unprocessedJobs": []
    }