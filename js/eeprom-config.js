var flybrix_app_configuration_version = [1,2,0]; //checked at startup!

var eepromConfig = {
	version : [0.0, 0.0, 0.0],
	pcbOrientation : [0.0, 0.0, 0.0],
	pcbTranslation : [0.0, 0.0, 0.0],
    mixTableFz : [0,0,0,0,0,0,0,0],
    mixTableTx : [0,0,0,0,0,0,0,0],
    mixTableTy : [0,0,0,0,0,0,0,0],
    mixTableTz : [0,0,0,0,0,0,0,0],
    magBias : [0.0, 0.0, 0.0],
	assignedChannel : [0, 0, 0, 0, 0, 0],
    commandInversion : 0,
    channelMidpoint : [0, 0, 0, 0, 0, 0],
    channelDeadzone: [0, 0, 0, 0, 0, 0],
	thrustMasterPIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	pitchMasterPIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	rollMasterPIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	yawMasterPIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	thrustSlavePIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	pitchSlavePIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	rollSlavePIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	yawSlavePIDParameters : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    pidBypass : 0,
	stateEstimationParameters : [0.0, 0.0],
	enableParameters : [0.0, 0.0]
};

var eepromConfigSize = 350;

DataView.prototype.parseCONFIG = function (structure) {
	var b = new byteRef();
    parseInt8Array(this, structure.version, b);
	parseFloat32Array(this, structure.pcbOrientation, b);
	parseFloat32Array(this, structure.pcbTranslation, b);
    parseInt8Array(this, structure.mixTableFz, b);
    parseInt8Array(this, structure.mixTableTx, b);
    parseInt8Array(this, structure.mixTableTy, b);
    parseInt8Array(this, structure.mixTableTz, b);
    parseFloat32Array(this, structure.magBias, b);
	parseUint8Array(this, structure.assignedChannel, b);
    structure.commandInversion = this.getUint8(b.index);
    b.add(1);
    parseUint16Array(this, structure.channelMidpoint, b);
    parseUint16Array(this, structure.channelDeadzone, b);
	parseFloat32Array(this, structure.thrustMasterPIDParameters, b);
	parseFloat32Array(this, structure.pitchMasterPIDParameters, b);
	parseFloat32Array(this, structure.rollMasterPIDParameters, b);
	parseFloat32Array(this, structure.yawMasterPIDParameters, b);
	parseFloat32Array(this, structure.thrustSlavePIDParameters, b);
	parseFloat32Array(this, structure.pitchSlavePIDParameters, b);
	parseFloat32Array(this, structure.rollSlavePIDParameters, b);
	parseFloat32Array(this, structure.yawSlavePIDParameters, b);
    structure.pidBypass = this.getUint8(b.index);
	b.add(1);
	parseFloat32Array(this, structure.stateEstimationParameters, b);
	parseFloat32Array(this, structure.enableParameters, b);
    
    setTimeout(eeprom_refresh_callback_list.fire, 1000);
}

DataView.prototype.setCONFIG = function (structure) {
	var b = new byteRef();
    setInt8Array(this, structure.version, b);
	setFloat32Array(this, structure.pcbOrientation, b);
	setFloat32Array(this, structure.pcbTranslation, b);
    setInt8Array(this, structure.mixTableFz, b);
    setInt8Array(this, structure.mixTableTx, b);
    setInt8Array(this, structure.mixTableTy, b);
    setInt8Array(this, structure.mixTableTz, b);
    setFloat32Array(this, structure.magBias, b);
	setUint8Array(this, structure.assignedChannel, b);
    this.setUint8(b.index, structure.commandInversion);
	b.add(1);
    setUint16Array(this, structure.channelMidpoint, b);
    setUint16Array(this, structure.channelDeadzone, b);
	setFloat32Array(this, structure.thrustMasterPIDParameters, b);
	setFloat32Array(this, structure.pitchMasterPIDParameters, b);
	setFloat32Array(this, structure.rollMasterPIDParameters, b);
	setFloat32Array(this, structure.yawMasterPIDParameters, b);
	setFloat32Array(this, structure.thrustSlavePIDParameters, b);
	setFloat32Array(this, structure.pitchSlavePIDParameters, b);
	setFloat32Array(this, structure.rollSlavePIDParameters, b);
	setFloat32Array(this, structure.yawSlavePIDParameters, b);
    this.setUint8(b.index, structure.pidBypass);
	b.add(1);
	setFloat32Array(this, structure.stateEstimationParameters, b);
	setFloat32Array(this, structure.enableParameters, b);
}

function requestCONFIG() {
	command_log('Requesting current configuration data...');
	send_message(CommandFields.COM_REQ_EEPROM_DATA | CommandFields.COM_REQ_RESPONSE, []);
    
}

function reinitCONFIG() {
	command_log('Requesting factory default configuration data...');
	send_message(CommandFields.COM_REINIT_EEPROM_DATA | CommandFields.COM_REQ_RESPONSE, []);
    
    setTimeout(requestCONFIG, 100);
}

function sendCONFIG() {
	command_log('Sending new configuration data...');
	var eepromConfigBytes = new ArrayBuffer(eepromConfigSize);
	var view = new DataView(eepromConfigBytes, 0);
	view.setCONFIG(eepromConfig);
	var data = new Uint8Array(eepromConfigBytes);
	send_message(CommandFields.COM_SET_EEPROM_DATA | CommandFields.COM_REQ_RESPONSE, data);

    setTimeout(requestCONFIG, 100);
}

var eeprom_refresh_callback_list = $.Callbacks('unique');

(function ($) {
    
	$.fn.connect_to_eeprom = function () {
		this.each(function () {

			$(this).bind("change", function (event) {
                class_strings = $(this).attr('class').split(/[ ]+/);
                if (class_strings.length == 2) {
                    window["eepromConfig"][class_strings[1]] = parseFloat($(this).val());
                }
                else if (class_strings.length == 3){
                    window["eepromConfig"][class_strings[1]][class_strings[2]] = parseFloat($(this).val()); 
                }
                else if (class_strings.length == 4) {
                    var bitfield = window["eepromConfig"][class_strings[2]];
                    if (this.checked){
                        bitfield = bitfield | (1<<class_strings[3]);
                    }
                    else {
                        bitfield = bitfield & ~(1<<class_strings[3]);
                    }
                    window["eepromConfig"][class_strings[2]] = bitfield;
                }
                else{
                    console.log("ERROR LINKING TO EEPROM: ", class_str, $(this).val());
                }
                setTimeout(function(){sendCONFIG(); setTimeout(eeprom_refresh_callback_list.fire, 100);}, 1);
			});
		});
	};
}
	(jQuery));
