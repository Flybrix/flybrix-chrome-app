(function() {
    'use strict';

    var deviceConfigFactory = function(serial, commandLog, serializer) {
        var eepromConfigSize = 350 + 273;
        var config;

        var desiredVersion = [1, 3, 0];  // checked at startup!

        function getDesiredVersion() {
            return desiredVersion;
        }

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
            ledStates: Array.apply(null, Array(272)).map(function() {
                return 0;
            }),
        };

        function resetConfig() {
            config = $.extend(true, {}, configBase);
        }

        function parse(dataView, structure) {
            var b = new serializer.ByteReference();
            serializer.parseInt8Array(dataView, structure.version, b);
            serializer.parseFloat32Array(dataView, structure.pcbOrientation, b);
            serializer.parseFloat32Array(dataView, structure.pcbTranslation, b);
            serializer.parseInt8Array(dataView, structure.mixTableFz, b);
            serializer.parseInt8Array(dataView, structure.mixTableTx, b);
            serializer.parseInt8Array(dataView, structure.mixTableTy, b);
            serializer.parseInt8Array(dataView, structure.mixTableTz, b);
            serializer.parseFloat32Array(dataView, structure.magBias, b);
            serializer.parseUint8Array(dataView, structure.assignedChannel, b);
            structure.commandInversion = dataView.getUint8(b.index);
            b.add(1);
            serializer.parseUint16Array(dataView, structure.channelMidpoint, b);
            serializer.parseUint16Array(dataView, structure.channelDeadzone, b);
            serializer.parseFloat32Array(dataView, structure.thrustMasterPIDParameters, b);
            serializer.parseFloat32Array(dataView, structure.pitchMasterPIDParameters, b);
            serializer.parseFloat32Array(dataView, structure.rollMasterPIDParameters, b);
            serializer.parseFloat32Array(dataView, structure.yawMasterPIDParameters, b);
            serializer.parseFloat32Array(dataView, structure.thrustSlavePIDParameters, b);
            serializer.parseFloat32Array(dataView, structure.pitchSlavePIDParameters, b);
            serializer.parseFloat32Array(dataView, structure.rollSlavePIDParameters, b);
            serializer.parseFloat32Array(dataView, structure.yawSlavePIDParameters, b);
            structure.pidBypass = dataView.getUint8(b.index);
            b.add(1);
            serializer.parseFloat32Array(dataView, structure.stateEstimationParameters, b);
            serializer.parseFloat32Array(dataView, structure.enableParameters, b);
            serializer.parseUint8Array(dataView, structure.ledStates, b);
        };

        function setConfig(dataView, structure) {
            var b = new serializer.ByteReference();
            serializer.setInt8Array(dataView, structure.version, b);
            serializer.setFloat32Array(dataView, structure.pcbOrientation, b);
            serializer.setFloat32Array(dataView, structure.pcbTranslation, b);
            serializer.setInt8Array(dataView, structure.mixTableFz, b);
            serializer.setInt8Array(dataView, structure.mixTableTx, b);
            serializer.setInt8Array(dataView, structure.mixTableTy, b);
            serializer.setInt8Array(dataView, structure.mixTableTz, b);
            serializer.setFloat32Array(dataView, structure.magBias, b);
            serializer.setUint8Array(dataView, structure.assignedChannel, b);
            dataView.setUint8(b.index, structure.commandInversion);
            b.add(1);
            serializer.setUint16Array(dataView, structure.channelMidpoint, b);
            serializer.setUint16Array(dataView, structure.channelDeadzone, b);
            serializer.setFloat32Array(dataView, structure.thrustMasterPIDParameters, b);
            serializer.setFloat32Array(dataView, structure.pitchMasterPIDParameters, b);
            serializer.setFloat32Array(dataView, structure.rollMasterPIDParameters, b);
            serializer.setFloat32Array(dataView, structure.yawMasterPIDParameters, b);
            serializer.setFloat32Array(dataView, structure.thrustSlavePIDParameters, b);
            serializer.setFloat32Array(dataView, structure.pitchSlavePIDParameters, b);
            serializer.setFloat32Array(dataView, structure.rollSlavePIDParameters, b);
            serializer.setFloat32Array(dataView, structure.yawSlavePIDParameters, b);
            dataView.setUint8(b.index, structure.pidBypass);
            b.add(1);
            serializer.setFloat32Array(dataView, structure.stateEstimationParameters, b);
            serializer.setFloat32Array(dataView, structure.enableParameters, b);
            serializer.setUint8Array(dataView, structure.ledStates, b);
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

        function send(newConfig) {
            if (newConfig === undefined)
                newConfig = config;
            commandLog('Sending new configuration data...');
            var eepromConfigBytes = new ArrayBuffer(eepromConfigSize);
            var view = new DataView(eepromConfigBytes, 0);
            setConfig(view, newConfig);
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
            if ((desiredVersion[0] != config.version[0]) || (desiredVersion[1] != config.version[1])) {
                commandLog('<span style="color: red">WARNING: Configuration MAJOR or MINOR version mismatch!</span>');
                commandLog(
                    'eeprom version: <strong>' + config.version[0] + '.' + config.version[1] + '.' + config.version[2] + '</strong>' +
                    ' - app expected version: <strong>' + desiredVersion.version[0] + '.' + desiredVersion.version[1] + '.' + desiredVersion.version[2] + '</strong>');
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

        return {
            request: request,
            reinit: reinit,
            send: send,
            getConfig: getConfig,
            setConfigCallback: setConfigCallback,
            getDesiredVersion: getDesiredVersion,
        };
    };

    angular.module('flybrixApp').factory('deviceConfig', ['serial', 'commandLog', 'serializer', deviceConfigFactory]);
}());
