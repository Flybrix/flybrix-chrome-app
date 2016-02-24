function readTextFile(file, callback)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", chrome.runtime.getURL(file), true);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === XMLHttpRequest.DONE)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                callback(rawFile.responseText);
            }
        }
    }
    rawFile.send(null);
}

function initialize_config_view() {

	$("#update_firmware").click(function () {
		console.log("TODO: load hex string for call to teensy-firmware.js");
		readTextFile($("#hexurl").val(), load_firmware);
	});

	$('#eeprom-refresh').click(function (e) {
		e.preventDefault();
        requestCONFIG();
		refresh_config_view_from_eepromConfig();
	});

	$('#eeprom-save').click(function (e) {
		e.preventDefault();
		console.log("TODO: save the eepromConfig to a file");
	});

	$('#eeprom-load').click(function (e) {
		e.preventDefault();
		console.log("TODO: load the eepromConfig from a file and send");
        refresh_config_view_from_eepromConfig();
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
