(function() {
    'use strict';

    var designController = function($scope, deviceConfig, commandLog) {
        $scope.models = [
                    {
                      label: 'xquad',
                      image: './models/x quad.JPG',
                      model: './models/builds/x quad.json',
                      url: './models/flyer_assembly_xquad_small.STL',
                      pdf: './pdfs/xquad.pdf',
                      defaultJSON: '{"version":[1,4,0],"config":{"version":[1,4,0],"id":0,"pcbOrientation":[0,0,0],"pcbTranslation":[0,0,0],"mixTableFz":[1,1,0,0,0,0,1,1],"mixTableTx":[1,1,0,0,0,0,-1,-1],"mixTableTy":[-1,1,0,0,0,0,-1,1],"mixTableTz":[1,-1,0,0,0,0,-1,1],"magBias":[0,0,0],"assignedChannel":[2,1,0,3,4,5],"commandInversion":6,"channelMidpoint":[1515,1515,1500,1520,1500,1500],"channelDeadzone":[20,20,20,40,20,20],"thrustMasterPIDParameters":[1,0,0,0,0.005,0.005,1],"pitchMasterPIDParameters":[10,1,0,10,0.005,0.005,10],"rollMasterPIDParameters":[10,1,0,10,0.005,0.005,10],"yawMasterPIDParameters":[5,1,0,10,0.005,0.005,180],"thrustSlavePIDParameters":[1,0,0,10,0.001,0.001,0.3],"pitchSlavePIDParameters":[10,4,0,30,0.001,0.001,30],"rollSlavePIDParameters":[10,4,0,30,0.001,0.001,30],"yawSlavePIDParameters":[30,5,0,20,0.001,0.001,240],"pidBypass":25,"stateEstimationParameters":[1,0.01],"enableParameters":[0.001,30],"ledStates":[2,0,5,0,0,0,0,0,0,25,0,0,25,0,0,1,0,4,0,5,25,0,0,25,0,0,0,0,0,0,0,0,1,0,1,0,5,0,13,0,0,13,0,0,13,0,0,13,0,0,0,8,0,1,25,17,0,25,17,0,25,17,0,25,17,0,0,0,0,64,4,0,0,25,0,0,25,0,0,25,0,0,25,0,0,0,1,1,0,0,0,0,0,0,0,0,25,0,0,25,0,0,0,2,1,0,0,25,0,0,25,0,0,0,0,0,0,0,0,0,128,2,25,0,0,25,0,0,25,0,0,25,0,0,0,0,0,16,1,25,0,0,25,0,0,25,0,0,25,0,0,0,0,0,8,2,25,17,0,25,17,0,25,17,0,25,17,0,0,0,32,0,1,0,0,25,0,0,25,0,0,25,0,0,25,0,0,0,4,2,0,0,25,0,0,25,0,0,25,0,0,25,0,0,16,0,2,0,13,0,0,13,0,0,13,0,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"xquad"}}',
                    },
                    {
                      label: 'flat6',
                      image: './models/flat6 hex.JPG',
                      model: './models/builds/hex.json',
                      pdf: './pdfs/flat6.pdf',
                      defaultJSON: '{"version":[1,4,0],"config":{"version":[1,4,0],"id":0,"pcbOrientation":[0,0,0],"pcbTranslation":[0,0,0],"mixTableFz":[1,1,1,1,0,0,1,1],"mixTableTx":[1,1,0,0,0,0,-1,-1],"mixTableTy":[-1,1,-1,1,0,0,-1,1],"mixTableTz":[1,-1,-1,1,0,0,1,-1],"magBias":[0,0,0],"assignedChannel":[2,1,0,3,4,5],"commandInversion":6,"channelMidpoint":[1515,1515,1500,1520,1500,1500],"channelDeadzone":[20,20,20,40,20,20],"thrustMasterPIDParameters":[1,0,0,0,0.005,0.005,1],"pitchMasterPIDParameters":[10,1,0,10,0.005,0.005,10],"rollMasterPIDParameters":[10,1,0,10,0.005,0.005,10],"yawMasterPIDParameters":[5,1,0,10,0.005,0.005,180],"thrustSlavePIDParameters":[1,0,0,10,0.001,0.001,0.3],"pitchSlavePIDParameters":[10,4,0,30,0.001,0.001,30],"rollSlavePIDParameters":[10,4,0,30,0.001,0.001,30],"yawSlavePIDParameters":[30,5,0,20,0.001,0.001,240],"pidBypass":25,"stateEstimationParameters":[1,0.01],"enableParameters":[0.001,30],"ledStates":[2,0,5,0,0,0,0,0,0,25,0,0,25,0,0,1,0,4,0,5,25,0,0,25,0,0,0,0,0,0,0,0,1,0,1,0,5,0,13,0,0,13,0,0,13,0,0,13,0,0,0,8,0,1,25,17,0,25,17,0,25,17,0,25,17,0,0,0,0,64,4,0,0,25,0,0,25,0,0,25,0,0,25,0,0,0,1,1,0,0,0,0,0,0,0,0,25,0,0,25,0,0,0,2,1,0,0,25,0,0,25,0,0,0,0,0,0,0,0,0,128,2,25,0,0,25,0,0,25,0,0,25,0,0,0,0,0,16,1,25,0,0,25,0,0,25,0,0,25,0,0,0,0,0,8,2,25,17,0,25,17,0,25,17,0,25,17,0,0,0,32,0,1,0,0,25,0,0,25,0,0,25,0,0,25,0,0,0,4,2,0,0,25,0,0,25,0,0,25,0,0,25,0,0,16,0,2,0,13,0,0,13,0,0,13,0,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"flat6"}}',
                    },
                    {
                      label: 'flat8',
                      image: './models/flat8 octo.JPG',
                      model: './models/builds/octo.json',
                      pdf: './pdfs/flat8.pdf',
                      defaultJSON: '{"version":[1,4,0],"config":{"version":[1,4,0],"id":0,"pcbOrientation":[0,0,0],"pcbTranslation":[0,0,0],"mixTableFz":[1,1,1,1,1,1,1,1],"mixTableTx":[1,1,1,1,-1,-1,-1,-1],"mixTableTy":[-1,1,-1,1,-1,1,-1,1],"mixTableTz":[1,-1,-1,1,1,-1,-1,1],"magBias":[0,0,0],"assignedChannel":[2,1,0,3,4,5],"commandInversion":6,"channelMidpoint":[1515,1515,1500,1520,1500,1500],"channelDeadzone":[20,20,20,40,20,20],"thrustMasterPIDParameters":[1,0,0,0,0.005,0.005,1],"pitchMasterPIDParameters":[10,1,0,10,0.005,0.005,10],"rollMasterPIDParameters":[10,1,0,10,0.005,0.005,10],"yawMasterPIDParameters":[5,1,0,10,0.005,0.005,180],"thrustSlavePIDParameters":[1,0,0,10,0.001,0.001,0.3],"pitchSlavePIDParameters":[10,4,0,30,0.001,0.001,30],"rollSlavePIDParameters":[10,4,0,30,0.001,0.001,30],"yawSlavePIDParameters":[30,5,0,20,0.001,0.001,240],"pidBypass":25,"stateEstimationParameters":[1,0.01],"enableParameters":[0.001,30],"ledStates":[2,0,5,0,0,0,0,0,0,25,0,0,25,0,0,1,0,4,0,5,25,0,0,25,0,0,0,0,0,0,0,0,1,0,1,0,5,0,13,0,0,13,0,0,13,0,0,13,0,0,0,8,0,1,25,17,0,25,17,0,25,17,0,25,17,0,0,0,0,64,4,0,0,25,0,0,25,0,0,25,0,0,25,0,0,0,1,1,0,0,0,0,0,0,0,0,25,0,0,25,0,0,0,2,1,0,0,25,0,0,25,0,0,0,0,0,0,0,0,0,128,2,25,0,0,25,0,0,25,0,0,25,0,0,0,0,0,16,1,25,0,0,25,0,0,25,0,0,25,0,0,0,0,0,8,2,25,17,0,25,17,0,25,17,0,25,17,0,0,0,32,0,1,0,0,25,0,0,25,0,0,25,0,0,25,0,0,0,4,2,0,0,25,0,0,25,0,0,25,0,0,25,0,0,16,0,2,0,13,0,0,13,0,0,13,0,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"flat8"}}',
                    },
                ];

                //duplicate of call in filehandler.js
                function migrate(config, recursive_call) {
                    recursive_call = recursive_call || false;
                    var desiredVersion = deviceConfig.getConfig().version.slice(0, 2).join('.');
                    var currentVersion = config.version.slice(0, 2).join('.');

                    if (desiredVersion === currentVersion) {  // http://semver.org/
                        if (recursive_call)
                            commandLog('Configuration update <span style="color: green;">SUCCESSFUL</span>');
                        return true;
                    }
                    if (!recursive_call)
                        commandLog('EEPROM version is newer than the configuration file - attempting update');
                    if (currentVersion in migrations) {
                        migrations[currentVersion](config);
                        return migrate(config, true);
                    }
                    return false;
                }
                
                $scope.sendConfigDefault = function(model) {
                    commandLog('Sending default configuration data for ' + model.label);

                    try {  // check if string provided is a valid JSON
                        var deserialized_config_object = JSON.parse(model.defaultJSON);
                        if (deserialized_config_object.version === undefined)
                            throw 'no version parameter found';
                    } catch (e) {
                        commandLog('invalid data');
                        return;
                    }

                    // replace eepromConfig with configuration from backup file
                    if (migrate(deserialized_config_object)) {  // http://semver.org/
                        commandLog('Configuration MAJOR and MINOR versions <span style="color: green;">MATCH</span>');
                        console.log('versions match');
                        // replace default BT name with current BT name before sending defaults!
                        deserialized_config_object.config.name = deviceConfig.getConfig().name;

                        deviceConfig.send(deserialized_config_object.config);
                    } else {
                        commandLog('Configuration MAJOR and MINOR versions <span style="color: red;">DO NOT MATCH</span>');
                        commandLog('Reading configuration <span style="color: red">FAILED</span>');
                        console.log('version mismatch');
                    }
                };
                
                $scope.setPdfChoice = function(choice) {
                    $scope.pdfUrl = choice.pdf;
                    $scope.sendConfigDefault(choice);
                };
    };

    var app = angular.module('flybrixApp');
    app.controller('designController', ['$scope', 'deviceConfig', 'commandLog', designController]);

}());
