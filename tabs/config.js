(function() {
    'use strict';

    var configController = function($scope, $rootScope, $timeout, deviceConfig, filehandler, commandLog, $firebaseObject) {
        function readHexFile(entry, callback) {
            if (!entry) {
                commandLog('No hex file selected!');
                console.log('no file selected');
                return;
            }

            // read contents into variable
            entry.file(function(file) {
                var reader = new FileReader();

                reader.onerror = function(e) {
                    console.log(e);
                };

                reader.onloadend = function(e) {
                    commandLog('Read <span style="color: green;">SUCCESSFUL</span>');
                    console.log('Read SUCCESSFUL');

                    callback(e.target.result);
                };

                reader.readAsText(file);
            });
        }

        $scope.loadHexFile = function() {
            var accepts = [{mimeTypes: ['text/*'], extensions: ['hex']}];
            chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(fileEntry) {
                readHexFile(fileEntry, function(hexData) {
					load_firmware(hexData);
                })
            });
        };

        $scope.configurationFilehandler = {
            save: function(entry) {
                filehandler.writeData(entry);
            },
            load: function(entry) {
                filehandler.readEepromConfig(entry);
            },
        };

        $scope.eepromRefresh = function() {
            deviceConfig.request();
        };

        $scope.eepromReinit = function() {
            deviceConfig.reinit();
        };

    };

    var app = angular.module('flybrixApp');

    app.controller('configController', ['$scope', '$rootScope', '$timeout', 'deviceConfig', 'filehandler', 'commandLog', configController]);

}());
