Firebase.INTERNAL.forceWebSockets();

var firebaseReference = new Firebase('https://flybrix.firebaseio.com/firmware');

var officialVersionKey = "Official " + flybrix_app_configuration_version.join(":");

function getFirmwareListElement(key, value, callbackLeft, callbackRight, labelRight) {
	var entry = $("<div />").attr("id", key).addClass("firmware-entry");
	var data = $("<table />");
	function createRow(key, label) {
		if (key in value) {
			var row = $("<tr />");
			row.append($("<td />").text(label).addClass("fw-label"));
			row.append($("<td />").text(value[key]).addClass("fw-data"));
			data.append(row);
		}
	}
	createRow("name", "Name:");
	createRow("author", "Author:");
	entry.append(data);
	entry.append($("<div />").addClass("button").addClass("firmware-button").text("update firmware").click(function () {
			callbackLeft(key, load_firmware);
		}));
	if (callbackRight) {
		entry.append($("<div />").addClass("button").addClass("firmware-button").text(labelRight).click(function () {
				callbackRight(key);
			}));
	}
	return entry;
}

function removeLocalFirmware(key) {
	chrome.storage.local.remove("hex:" + key, function () {
		console.log("Firmware", key, "removed");
	});
}

function updateLocalStorageData() {
	var hexList = $("#hex-local");
	hexList.empty();
	chrome.storage.local.get(null, function (items) {
		for (var key in items) {
			if (key.substring(0, 4) !== "hex:")
				continue;
			var dataLocation = hexList;
			var callbackRight = removeLocalFirmware;
			var shortKey = key.substring(4);
			if (shortKey === "@remote:" + officialVersionKey) {
				dataLocation = $("#hex-recommended");
				dataLocation.empty();
				callbackRight = null;
			}
			var item = items[key];
			if (!("info" in item) || !("hex" in item))
				continue;
			dataLocation.append(getFirmwareListElement(shortKey, item.info, function (a, b) {
					var longKey = "hex:" + a;
					chrome.storage.local.get(longKey, function (items) {
						if (!(longKey in items))
							return;
						var item = items[longKey];
						if (!("hex" in item))
							return;
						b(item.hex);
					})
				}, callbackRight, "remove"));
		}
	});
}

firebaseReference.on('value', function (snapshot) {
	var hexList = $("#hex-remote");
	hexList.empty();
	snapshot.forEach(function (child) {
		var key = child.key();
		var info = child.child("info").val();
		hexList.append(getFirmwareListElement(key, info, readFirebaseEntry, function (key) {
				readFirebaseEntryFull(key, function (data) {
					var entry = {};
					entry["hex:@remote:" + key] = data;
					chrome.storage.local.set(entry, function () {
						console.log("Firmware", key, "stored");
					});
				});
			}, "store"));
		if (key === officialVersionKey) {
			var entry = {};
			entry["hex:@remote:" + key] = child.val();
			chrome.storage.local.set(entry, function () {
				console.log("Recommended hex version stored");
			});
		}
	});
});

function readFirebaseEntry(key, callback) {
	firebaseReference.child(key).child("hex").once("value", function (snapshot) {
		callback(snapshot.val());
	});
}

function readFirebaseEntryFull(key, callback) {
	firebaseReference.child(key).once("value", function (snapshot) {
		callback(snapshot.val());
	});
}

function readLocalEntry(key, callback) {
	var longKey = "hex:" + key;
	chrome.storage.local.get(longKey, function (items) {
		if (!(longKey in items))
			return;
		var item = items[longKey];
		if (!("hex" in item))
			return;
		callback(item.hex);
	})
}

function readTextFile(file, callback) {
	readURL(chrome.runtime.getURL(file), callback);
}

function readURL(file, callback) {
	var rawFile = new XMLHttpRequest();
	rawFile.open("GET", file, true);
	rawFile.onreadystatechange = function () {
		if (rawFile.readyState === XMLHttpRequest.DONE) {
			if (rawFile.status === 200 || rawFile.status == 0) {
				callback(rawFile.responseText);
			}
		}
	}
	rawFile.send(null);
}

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
	updateLocalStorageData();
	chrome.storage.onChanged.addListener(updateLocalStorageData);

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

    var configController = function($scope, $rootScope, deviceConfig) {
        $scope.eepromRefresh = function() {
            deviceConfig.request();
        };

        $scope.eepromReinit = function() {
            deviceConfig.reinit();
        };
    };

    angular.module('flybrixApp').controller('configController', ['$scope', '$rootScope', 'deviceConfig', configController]);
}());
