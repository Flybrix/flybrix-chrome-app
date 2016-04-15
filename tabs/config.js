function readHexFile(entry, callback) {
	if (!entry) {
		command_log('No hex file selected!');
		console.log('no file selected');
		return;
	}

	// read contents into variable
	entry.file(function (file) {
		var reader = new FileReader();

		reader.onerror = function (e) {
			console.log(e);
		};

		reader.onloadend = function (e) {
			command_log('Read <span style="color: green;">SUCCESSFUL</span>');
			console.log('Read SUCCESSFUL');

			callback(e.target.result);
		};

		reader.readAsText(file);
	});
}

function initialize_config_view() {
	$('#load-hex-file').click(function (e) {
		e.preventDefault();
		var accepts = [{
				mimeTypes : ['text/*'],
				extensions : ['hex']
			}
		];
		chrome.fileSystem.chooseEntry({
			type : 'openFile',
			accepts : accepts
		}, function (fileEntry) {
			readHexFile(fileEntry, function (hexData) {
				var entry = {};
				entry["hex:@local:" + fileEntry.name] = {
					info : {
						name : fileEntry.name,
						author : "Local file"
					},
					hex : hexData
				}
				chrome.storage.local.set(entry, function () {
					console.log("Local file loaded");
				});
			})
		});
	});

	$('#configuration-filehandler').create_filehandler("save", "load");

	$('#configuration-filehandler #button1').unbind().click(function (event) { // save button
		event.preventDefault();
		$('#configuration-filehandler').write_eepromConfig_to_filehandler();
	});

	$('#configuration-filehandler #button2').unbind().click(function (event) { // load button
		event.preventDefault();
		$('#configuration-filehandler').read_eepromConfig_from_filehandler();
	});
}

(function() {
    'use strict';

    var configController = function($scope, $rootScope, $timeout, deviceConfig, $firebaseObject) {
        $scope.eepromRefresh = function() {
            deviceConfig.request();
        };

        $scope.eepromReinit = function() {
            deviceConfig.reinit();
        };

				var officialVersionKey = "Official " + flybrix_app_configuration_version.join(":");

        Firebase.INTERNAL.forceWebSockets();
        $timeout(function() {
            var firebaseReference = new Firebase('https://flybrix.firebaseio.com/firmware');
            var syncObject = $firebaseObject(firebaseReference);
            syncObject.$bindTo($scope, 'firmwareRemote');
        }, 0);

        $scope.loadFirmware = function(hex) {
						console.log(hex);
            load_firmware(hex);
        };

				function removeLocalFirmware(key) {
						chrome.storage.local.remove("hex:" + key, function () {
								console.log("Firmware", key, "removed");
						});
				};

				$scope.storeLocalFirmware = function(key, data) {
						var entry = {};
						entry["hex:@remote:" + key] = data;
						chrome.storage.local.set(entry, function () {
								console.log("Firmware", key, "stored");
						});
				}

        function getEntriesFromStorage(items) {
						$scope.$apply(function () {
								$scope.recommendedFirmware = undefined;
		            $scope.firmwareLocal = Object.keys(items)
		                .filter(function(key) {
		                    return key.substring(0, 4) === 'hex:'
		                })
		                .map(function(key) {
												var shortKey = key.substring(4);
												if (shortKey === "@remote:" + officialVersionKey)
														$scope.recommendedFirmware = items[key];
		                    return {
		                        data: items[key],
														callbackRight: function () {
																removeLocalFirmware(shortKey);
														}
		                    };
		                });
						});
        }
				chrome.storage.onChanged.addListener(function() {
						chrome.storage.local.get(null, getEntriesFromStorage);
				});
				chrome.storage.local.get(null, getEntriesFromStorage);
    };

    var app = angular.module('flybrixApp');

    app.controller('configController', ['$scope', '$rootScope', '$timeout', 'deviceConfig', '$firebaseObject', configController]);

    app.directive('firmwareCard', function() {
        return {
            templateUrl: 'tabs/templates/firmware-card.html',
            scope: {
                data: '=',
                callbackRight: '=',
                labelRight: '=',
								key: '=',
            },
        };
    });
}());
