(function() {
    'use strict';

    // A map of all migration functions that update configuration data
    var migrations = {
        '0.8': function(config) {
            config.version = config.config.version = [0, 9, 0];
            console.log("Went from 0.8 to 0.9");
            console.log("The migration system works!");
        },
        '0.9': function(config) {
            config.version = config.config.version = [1, 0, 0];
            console.log("Went from 0.9 to 1.0");
            console.log("The migration system works!");
        },
        '1.0': function(config) {
            // no changes to the actual config structure, but some PID parameters were changed
            config.version = config.config.version = [1, 1, 0];
            console.log("Went from 1.0 to 1.1");
        }
    };

    var filehandlerBar = function() {
        var link = function(scope, element, attrs, ngModel) {

            ngModel.$render = function() {
                scope.buttons = ngModel.$modelValue;
            };

            scope.chosenEntry = null;
            scope.file = "Please select file!";

            scope.openButtonClick = function() {
                var accepts = [{mimeTypes: ['text/*'], extensions: ['dat', 'csv', 'txt', 'bin', 'log', 'raw', 'json']}];
                chrome.fileSystem.chooseEntry({type: 'saveFile', accepts: accepts}, function(theEntry) {
                    if (!theEntry) {
                        scope.file = 'No File Selected!';
                        return;
                    }
                    scope.chosenEntry = theEntry;

                    chrome.fileSystem.getDisplayPath(theEntry, function(displayPath) {
                        scope.file = displayPath;
                    });
                });
            };
        };

        return {
            templateUrl: '/templates/filehandlerBar.html',
            scope: true,
            require: 'ngModel',
            priority: 1,
            link: link,
        };
    };

    var filehandlerHelper = function(deviceConfig, commandLog) {
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

        function writeData(entry, data) {
            if (!entry) {
                console.log('no file selected');
                return;
            }
            var dataReader = new window.FileReader();
            dataReader.onloadend = function(e) {
                entry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = function() {
                        if (fileWriter.length !== 0)
                            return;
                        var config = deviceConfig.getConfig();
                        var output = {version: config.version, config: config};
                        if (data !== undefined)
                            output.data = btoa(String.fromCharCode.apply(null, new Uint8Array(e.target.result)));
                        fileWriter.write(new Blob([JSON.stringify(output)]));
                    };
                    fileWriter.onerror = function(err) {
                        console.log('data write failed:', err.toString());
                    };
                    fileWriter.truncate(0);
                });
            };
            var usedData = new Blob();
            if (data !== undefined)
                usedData = data;
            dataReader.readAsArrayBuffer(usedData);
        }

        function readEepromConfig(entry) {
            if (!entry) {
                commandLog('No file selected for loading configuration!');
                console.log('no file selected');
                return;
            }

            entry.file(function(file) {
                var reader = new FileReader();

                reader.onerror = function(e) {
                    commandLog('Reading configuration <span style="color: red">FAILED</span>');
                    console.error(e);
                };

                reader.onloadend = function(e) {
                    commandLog('Reading configuration was <span style="color: green;">SUCCESSFUL</span>');

                    try {  // check if string provided is a valid JSON
                        var deserialized_config_object = JSON.parse(e.target.result);
                        if (deserialized_config_object.version === undefined)
                            throw 'no version parameter found';
                    } catch (e) {
                        commandLog('Reading configuration <span style="color: red">FAILED</span>');
                        commandLog('File provided doesn\'t contain valid data');
                        return;
                    }

                    // replace eepromConfig with configuration from backup file
                    if (migrate(deserialized_config_object)) {  // http://semver.org/
                        commandLog('Configuration MAJOR and MINOR versions <span style="color: green;">MATCH</span>');
                        console.log('versions match');

                        deviceConfig.send(deserialized_config_object.config);
                    } else {
                        commandLog('Configuration MAJOR and MINOR versions <span style="color: red;">DO NOT MATCH</span>');
                        commandLog('Reading configuration <span style="color: red">FAILED</span>');
                        console.log('version mismatch');
                    }
                };

                reader.readAsText(file);
            });
        }

        return {
            writeData: writeData,
            readEepromConfig: readEepromConfig,
        };
    };

    var app = angular.module('flybrixApp');

    app.directive('filehandlerBar', filehandlerBar);

    app.factory('filehandler', ['deviceConfig', 'commandLog', filehandlerHelper]);

}());
