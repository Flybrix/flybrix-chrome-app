var flybrix_app_configuration_version = [1, 2, 0];  // checked at startup!

// TODO: remove all of this once we encapsulate everything
var eepromConfig;
var requestCONFIG;
var sendCONFIG;

var eeprom_refresh_callback_list = $.Callbacks('unique');

(function($) {

    $.fn.connect_to_eeprom = function() {
        this.each(function() {

            $(this)
                .bind("change", function(event) {
                    class_strings = $(this).attr('class').split(/[ ]+/);
                    if (class_strings.length == 2) {
                        window["eepromConfig"][class_strings[1]] = parseFloat($(this).val());
                    } else if (class_strings.length == 3) {
                        window["eepromConfig"][class_strings[1]][class_strings[2]] = parseFloat($(this).val());
                    } else if (class_strings.length == 4) {
                        var bitfield = window["eepromConfig"][class_strings[2]];
                        if (this.checked) {
                            bitfield = bitfield | (1 << class_strings[3]);
                        } else {
                            bitfield = bitfield & ~(1 << class_strings[3]);
                        }
                        window["eepromConfig"][class_strings[2]] = bitfield;
                    } else {
                        console.log("ERROR LINKING TO EEPROM: ", class_str, $(this).val());
                    }
                    setTimeout(function() {
                        sendCONFIG();
                        setTimeout(eeprom_refresh_callback_list.fire, 100);
                    }, 1);
                });
        });
    };
}(jQuery));

(function() {
    'use strict';

    var deviceConfigFactory = function(serial, commandLog) {
        var eepromConfigSize = 350;
        var config;

        var configBase = {
            version: [0.0, 0.0, 0.0],
            pcbOrientation: [0.0, 0.0, 0.0],
            pcbTranslation: [0.0, 0.0, 0.0],
            mixTableFz: [0, 0, 0, 0, 0, 0, 0, 0],
            mixTableTx: [0, 0, 0, 0, 0, 0, 0, 0],
            mixTableTy: [0, 0, 0, 0, 0, 0, 0, 0],
            mixTableTz: [0, 0, 0, 0, 0, 0, 0, 0],
            magBias: [0.0, 0.0, 0.0],
            assignedChannel: [0, 0, 0, 0, 0, 0],
            commandInversion: 0,
            channelMidpoint: [0, 0, 0, 0, 0, 0],
            channelDeadzone: [0, 0, 0, 0, 0, 0],
            thrustMasterPIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            pitchMasterPIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            rollMasterPIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            yawMasterPIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            thrustSlavePIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            pitchSlavePIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            rollSlavePIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            yawSlavePIDParameters: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            pidBypass: 0,
            stateEstimationParameters: [0.0, 0.0],
            enableParameters: [0.0, 0.0],
        };

        function resetConfig() {
            config = $.extend(true, {}, configBase);
            eepromConfig = config;  // TODO: remove this line once we encapsulate everything
        }

        function parse(dataView, structure) {
            var b = new byteRef();
            parseInt8Array(dataView, structure.version, b);
            parseFloat32Array(dataView, structure.pcbOrientation, b);
            parseFloat32Array(dataView, structure.pcbTranslation, b);
            parseInt8Array(dataView, structure.mixTableFz, b);
            parseInt8Array(dataView, structure.mixTableTx, b);
            parseInt8Array(dataView, structure.mixTableTy, b);
            parseInt8Array(dataView, structure.mixTableTz, b);
            parseFloat32Array(dataView, structure.magBias, b);
            parseUint8Array(dataView, structure.assignedChannel, b);
            structure.commandInversion = dataView.getUint8(b.index);
            b.add(1);
            parseUint16Array(dataView, structure.channelMidpoint, b);
            parseUint16Array(dataView, structure.channelDeadzone, b);
            parseFloat32Array(dataView, structure.thrustMasterPIDParameters, b);
            parseFloat32Array(dataView, structure.pitchMasterPIDParameters, b);
            parseFloat32Array(dataView, structure.rollMasterPIDParameters, b);
            parseFloat32Array(dataView, structure.yawMasterPIDParameters, b);
            parseFloat32Array(dataView, structure.thrustSlavePIDParameters, b);
            parseFloat32Array(dataView, structure.pitchSlavePIDParameters, b);
            parseFloat32Array(dataView, structure.rollSlavePIDParameters, b);
            parseFloat32Array(dataView, structure.yawSlavePIDParameters, b);
            structure.pidBypass = dataView.getUint8(b.index);
            b.add(1);
            parseFloat32Array(dataView, structure.stateEstimationParameters, b);
            parseFloat32Array(dataView, structure.enableParameters, b);

            setTimeout(eeprom_refresh_callback_list.fire, 1000);
        };

        function setConfig(dataView, structure) {
            var b = new byteRef();
            setInt8Array(dataView, structure.version, b);
            setFloat32Array(dataView, structure.pcbOrientation, b);
            setFloat32Array(dataView, structure.pcbTranslation, b);
            setInt8Array(dataView, structure.mixTableFz, b);
            setInt8Array(dataView, structure.mixTableTx, b);
            setInt8Array(dataView, structure.mixTableTy, b);
            setInt8Array(dataView, structure.mixTableTz, b);
            setFloat32Array(dataView, structure.magBias, b);
            setUint8Array(dataView, structure.assignedChannel, b);
            dataView.setUint8(b.index, structure.commandInversion);
            b.add(1);
            setUint16Array(dataView, structure.channelMidpoint, b);
            setUint16Array(dataView, structure.channelDeadzone, b);
            setFloat32Array(dataView, structure.thrustMasterPIDParameters, b);
            setFloat32Array(dataView, structure.pitchMasterPIDParameters, b);
            setFloat32Array(dataView, structure.rollMasterPIDParameters, b);
            setFloat32Array(dataView, structure.yawMasterPIDParameters, b);
            setFloat32Array(dataView, structure.thrustSlavePIDParameters, b);
            setFloat32Array(dataView, structure.pitchSlavePIDParameters, b);
            setFloat32Array(dataView, structure.rollSlavePIDParameters, b);
            setFloat32Array(dataView, structure.yawSlavePIDParameters, b);
            dataView.setUint8(b.index, structure.pidBypass);
            b.add(1);
            setFloat32Array(dataView, structure.stateEstimationParameters, b);
            setFloat32Array(dataView, structure.enableParameters, b);
        };

        function request() {
            commandLog('Requesting current configuration data...');
            serial.send(serial.field.COM_REQ_EEPROM_DATA, [], false);
        }

        function reinit() {
            commandLog('Setting factory default configuration data...');
            serial.send(serial.field.COM_REINIT_EEPROM_DATA, [], false)
                .then(
                    function() {
                        request();
                    },
                    function(reason) {
                        commandLog('Request for factory reset failed: ' + reason);
                    });
        }

        function send() {
            commandLog('Sending new configuration data...');
            var eepromConfigBytes = new ArrayBuffer(eepromConfigSize);
            var view = new DataView(eepromConfigBytes, 0);
            setConfig(view, config);
            var data = new Uint8Array(eepromConfigBytes);
            serial.send(serial.field.COM_SET_EEPROM_DATA, data, false).then(function() {
                request();
            });
        }

        serial.setCommandCallback(function(mask, message_buffer) {
            if (mask !== serial.field.COM_SET_EEPROM_DATA)
                return;
            console.log("Received config!");
            var data = new DataView(message_buffer, 0);
            resetConfig();
            parse(data, config);
            if ((flybrix_app_configuration_version[0] != config.version[0]) || (flybrix_app_configuration_version[1] != config.version[1])) {
                commandLog('<span style="color: red">WARNING: Configuration MAJOR or MINOR version mismatch!</span>');
                commandLog(
                    'eeprom version: <strong>' + config.version[0] + '.' + config.version[1] + '.' + config.version[2] + '</strong>' +
                    ' - app expected version: <strong>' + flybrix_app_configuration_version.version[0] + '.' + flybrix_app_configuration_version.version[1] + '.' +
                    flybrix_app_configuration_version.version[2] + '</strong>');
            } else {
                commandLog('Recieved configuration version: <span style="color: green">' + config.version[0] + '.' + config.version[1] + '.' + config.version[2] + '</span>');
                configCallback();
            }
        });

        var configCallback = function() {};

        function setConfigCallback(callback) {
            configCallback = callback;
        }

        function getConfig() {
            return config;
        }

        resetConfig();

        // TODO: remove
        requestCONFIG = request;
        sendCONFIG = function() {
            send();
        };

        return {
            request: request,
            reinit: reinit,
            send: send,
            getConfig: getConfig,
            setConfigCallback: setConfigCallback,
        };
    };

    angular.module('flybrixApp').factory('deviceConfig', ['serial', 'commandLog', deviceConfigFactory]);
}());
