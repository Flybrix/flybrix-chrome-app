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
		setTimeout(function () {
			refresh_config_view_from_eepromConfig();
		}, 100);
	});

    $('#eeprom-refresh').click(function (event) {
  		event.preventDefault();
        requestCONFIG();
        // parseCONFIG will update views subscribed to eeprom_refresh_callback_list
    });
    
	// accept only numeric input on model-entry-fields
	$("#current-config .model-entry-field").keydown(function (e) {
		// Allow: backspace, delete, tab, escape, enter, '.', and '-'
		if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190, 189]) !== -1 ||
			// Allow: Ctrl+A
			(e.keyCode == 65 && e.ctrlKey === true) ||
			// Allow: Ctrl+C
			(e.keyCode == 67 && e.ctrlKey === true) ||
			// Allow: Ctrl+X
			(e.keyCode == 88 && e.ctrlKey === true) ||
			// Allow: home, end, left, right
			(e.keyCode >= 35 && e.keyCode <= 39)) {
			// let it happen, don't do anything
			return;
		}
		// Ensure that it is a number and stop the keypress
		if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
			e.preventDefault();
		}
	});
	// version is read only
	$("#current-config .model-entry-field.version").keydown(function (e) {
		e.preventDefault();
	});

	$('#current-config .model-entry-field').connect_to_eeprom();
	eeprom_refresh_callback_list.add(refresh_config_view_from_eepromConfig);

	refresh_config_view_from_eepromConfig();
}

function refresh_config_view_from_eepromConfig() {
	//populate using eepromConfig data
	loadArrayValues($("#current-config .version"), eepromConfig.version, 0);
	loadArrayValues($("#current-config .pcbOrientation"), eepromConfig.pcbOrientation, 1);
	loadArrayValues($("#current-config .pcbTranslation"), eepromConfig.pcbTranslation, 3);
	loadArrayValues($("#current-config .mixTableFz"), eepromConfig.mixTableFz, 0);
	loadArrayValues($("#current-config .mixTableTx"), eepromConfig.mixTableTx, 0);
	loadArrayValues($("#current-config .mixTableTy"), eepromConfig.mixTableTy, 0);
	loadArrayValues($("#current-config .mixTableTz"), eepromConfig.mixTableTz, 0);
	loadArrayValues($("#current-config .magBias"), eepromConfig.magBias, 3);
	loadArrayValues($("#current-config .assignedChannel"), eepromConfig.assignedChannel, 0);
	$("#current-config .commandInversion").val((eepromConfig.commandInversion * 1.0).toFixed(0));
	loadArrayValues($("#current-config .channelMidpoint"), eepromConfig.channelMidpoint, 0);
	loadArrayValues($("#current-config .channelDeadzone"), eepromConfig.channelDeadzone, 0);
	loadArrayValues($("#current-config .thrustMasterPIDParameters"), eepromConfig.thrustMasterPIDParameters, 4);
	loadArrayValues($("#current-config .pitchMasterPIDParameters"), eepromConfig.pitchMasterPIDParameters, 4);
	loadArrayValues($("#current-config .rollMasterPIDParameters"), eepromConfig.rollMasterPIDParameters, 4);
	loadArrayValues($("#current-config .yawMasterPIDParameters"), eepromConfig.yawMasterPIDParameters, 4);
	loadArrayValues($("#current-config .thrustSlavePIDParameters"), eepromConfig.thrustSlavePIDParameters, 4);
	loadArrayValues($("#current-config .pitchSlavePIDParameters"), eepromConfig.pitchSlavePIDParameters, 4);
	loadArrayValues($("#current-config .rollSlavePIDParameters"), eepromConfig.rollSlavePIDParameters, 4);
	loadArrayValues($("#current-config .yawSlavePIDParameters"), eepromConfig.yawSlavePIDParameters, 4);
	$("#current-config .pidBypass").val((eepromConfig.pidBypass * 1.0).toFixed(0));
	loadArrayValues($("#current-config .stateEstimationParameters"), eepromConfig.stateEstimationParameters, 5);
	loadArrayValues($("#current-config .enableParameters"), eepromConfig.enableParameters, 5);
}
