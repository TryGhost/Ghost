**Describe selected asset configurations**

This example command describes the configurations of two specified servers. The action detects the type of asset from the configuration ID. Only one type of asset is allowed per command.

Command:: 

  aws discovery describe-configurations --configuration-ids "d-server-099385097ef9fbcfb" "d-server-0c4f2dd1fee22c6c1"

Output::

   {
       "configurations": [
           {
	            "server.performance.maxCpuUsagePct": "0.0",
	            "server.performance.maxDiskReadIOPS": "0.0",
        	    "server.performance.avgCpuUsagePct": "0.0",
	            "server.type": "EC2",
	            "server.performance.maxNetworkReadsPerSecondInKB": "0.19140625",
	            "server.hostName": "ip-172-31-35-152",
	            "server.configurationId": "d-server-0c4f2dd1fee22c6c1",
	            "server.tags.hasMoreValues": "false",
	            "server.performance.minFreeRAMInKB": "1543496.0",
	            "server.osVersion": "3.14.48-33.39.amzn1.x86_64",
	            "server.performance.maxDiskReadsPerSecondInKB": "0.0",
	            "server.applications": "[]",
	            "server.performance.numDisks": "1",
	            "server.performance.numCpus": "1",
	            "server.performance.numCores": "1",
	            "server.performance.maxDiskWriteIOPS": "0.0",
	            "server.performance.maxNetworkWritesPerSecondInKB": "0.82421875",
	            "server.performance.avgDiskWritesPerSecondInKB": "0.0",
	            "server.networkInterfaceInfo": "[{\"name\":\"eth0\",\"macAddress\":\"06:A7:7D:3F:54:57\",\"ipAddress\":\"172.31.35.152\",\"netMask\":\"255.255.240.0\"},{\"name\":\"lo\",\"macAddress\":\"00:00:00:00:00:00\",\"ipAddress\":\"127.0.0.1\",\"netMask\":\"255.0.0.0\"},{\"name\":\"eth0\",\"macAddress\":\"06:A7:7D:3F:54:57\",\"ipAddress\":\"fe80::4a7:7dff:fe3f:5457\"},{\"name\":\"lo\",\"macAddress\":\"00:00:00:00:00:00\",\"ipAddress\":\"::1\"}]",
	            "server.performance.avgNetworkReadsPerSecondInKB": "0.04915364583333333",
	            "server.tags": "[]",
	            "server.applications.hasMoreValues": "false",
	            "server.timeOfCreation": "2016-10-28 23:44:00.0",
	            "server.agentId": "i-4447bc1b",
	            "server.performance.maxDiskWritesPerSecondInKB": "0.0",
	            "server.performance.avgDiskReadIOPS": "0.0",
	            "server.performance.avgFreeRAMInKB": "1547210.1333333333",
	            "server.performance.avgDiskReadsPerSecondInKB": "0.0",
	            "server.performance.avgDiskWriteIOPS": "0.0",
	            "server.performance.numNetworkCards": "2",
	            "server.hypervisor": "xen",
	            "server.networkInterfaceInfo.hasMoreValues": "false",
	            "server.performance.avgNetworkWritesPerSecondInKB": "0.1380859375",
	            "server.osName": "Linux - Amazon Linux AMI release 2015.03",
	            "server.performance.totalRAMInKB": "1694732.0",
	            "server.cpuType": "x64"
           },
	   {
	            "server.performance.maxCpuUsagePct": "100.0",
	            "server.performance.maxDiskReadIOPS": "0.0",
	            "server.performance.avgCpuUsagePct": "14.733333333333338",
	            "server.type": "EC2",
	            "server.performance.maxNetworkReadsPerSecondInKB": "13.400390625",
	            "server.hostName": "ip-172-31-42-208",
	            "server.configurationId": "d-server-099385097ef9fbcfb",
	            "server.tags.hasMoreValues": "false",
	            "server.performance.minFreeRAMInKB": "1531104.0",
	            "server.osVersion": "3.14.48-33.39.amzn1.x86_64",
	            "server.performance.maxDiskReadsPerSecondInKB": "0.0",
	            "server.applications": "[]",
	            "server.performance.numDisks": "1",
	            "server.performance.numCpus": "1",
	            "server.performance.numCores": "1",
	            "server.performance.maxDiskWriteIOPS": "1.0",
	            "server.performance.maxNetworkWritesPerSecondInKB": "12.271484375",
	            "server.performance.avgDiskWritesPerSecondInKB": "0.5333333333333334",
	            "server.networkInterfaceInfo": "[{\"name\":\"eth0\",\"macAddress\":\"06:4A:79:60:75:61\",\"ipAddress\":\"172.31.42.208\",\"netMask\":\"255.255.240.0\"},{\"name\":\"eth0\",\"macAddress\":\"06:4A:79:60:75:61\",\"ipAddress\":\"fe80::44a:79ff:fe60:7561\"},{\"name\":\"lo\",\"macAddress\":\"00:00:00:00:00:00\",\"ipAddress\":\"::1\"},{\"name\":\"lo\",\"macAddress\":\"00:00:00:00:00:00\",\"ipAddress\":\"127.0.0.1\",\"netMask\":\"255.0.0.0\"}]",
	            "server.performance.avgNetworkReadsPerSecondInKB": "2.8720052083333334",
	            "server.tags": "[]",
	            "server.applications.hasMoreValues": "false",
	            "server.timeOfCreation": "2016-10-28 23:44:30.0",
	            "server.agentId": "i-c142b99e",
	            "server.performance.maxDiskWritesPerSecondInKB": "4.0",
	            "server.performance.avgDiskReadIOPS": "0.0",
	            "server.performance.avgFreeRAMInKB": "1534946.4",
	            "server.performance.avgDiskReadsPerSecondInKB": "0.0",
	            "server.performance.avgDiskWriteIOPS": "0.13333333333333336",
	            "server.performance.numNetworkCards": "2",
	            "server.hypervisor": "xen",
	            "server.networkInterfaceInfo.hasMoreValues": "false",
	            "server.performance.avgNetworkWritesPerSecondInKB": "1.7977864583333332",
	            "server.osName": "Linux - Amazon Linux AMI release 2015.03",
	            "server.performance.totalRAMInKB": "1694732.0",
	            "server.cpuType": "x64"
	   }
       ]
   }


**Describe selected asset configurations**

This example command describes the configurations of two specified applications. The action detects the type of asset from the configuration ID. Only one type of asset is allowed per command.

Command::

  aws discovery describe-configurations --configuration-ids "d-application-0ac39bc0e4fad0e42" "d-application-02444a45288013764q"

Output::

   {
       "configurations": [
           {
	            "application.serverCount": "0",
	            "application.name": "Application-12345",
	            "application.lastModifiedTime": "2016-12-13 23:53:27.0",
	            "application.description": "",
	            "application.timeOfCreation": "2016-12-13 23:53:27.0",
	            "application.configurationId": "d-application-0ac39bc0e4fad0e42"
           },
           {
                    "application.serverCount": "0",		
	            "application.name": "Application-67890",
	            "application.lastModifiedTime": "2016-12-13 23:53:33.0",
	            "application.description": "",
	            "application.timeOfCreation": "2016-12-13 23:53:33.0",
	            "application.configurationId": "d-application-02444a45288013764"
            }
       ]
   }
