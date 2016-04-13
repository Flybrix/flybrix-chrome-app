var graph_update_delay = 50;

var capture_mode_callback = function(data) {
    console.log("ERROR: capture mode callback not set!")
};

var send_message;

(function() {
    'use strict';

    var serialFactory = function($q, $timeout, $interval, cobs, commandLog, parser, deviceConfig) {
        var last_port_usage_update = 0;
        var char_counter = 0;  // used to keep track of serial port data rate
        var portUsageInterval = null;

        function portUsageStop() {
            if (!portUsageInterval)
                return;
            $interval.cancel(portUsageInterval);
        }

        function portUsageStart() {
            portUsageStop();
            portUsageInterval = $interval(portUsage, 1000);
        }

        function portUsage() {
            var now = Date.now();

            graph_update_delay *= 0.8;
            if (graph_update_delay < 50) {
                graph_update_delay = 50;
            }

            if (last_port_usage_update > 0) {
                var ui_update_rate = now - last_port_usage_update;  // should be 1000 msec, as per setTimeout that calls

                // throttle back datastream when the UI lags behind to keep things usable
                if (ui_update_rate > 1020) {
                    command_log('UI is falling behind -- <span style="color: red;">SLOWING DOWN GRAPH UPDATES</span>');
                    graph_update_delay *= 2.0;
                }
                var port_speed_kbps = char_counter / ui_update_rate;
                $('#port-usage').html(port_speed_kbps.toFixed(3) + ' kbps');
            };
            char_counter = 0;
            last_port_usage_update = now;
        }

        var acknowledges = [];
        // Get access to the background window object
        // This object is used to pass current serial port connectionId to the backround page
        // so the onClosed event can close the port for us if it was left opened, without this
        // users can experience weird behavior if they would like to access the serial bus afterwards.
        var backgroundPage = null;

        chrome.runtime.getBackgroundPage(function(result) {
            backgroundPage = result;
            backgroundPage.serialConnectionId = -1;
        });

        function onConnectCallback(connectionInfo, serialPort, response) {
            if (!connectionInfo) {
                console.log('There was a problem while opening the connection.');
                commandLog('Could not join the serial bus -- <span style="color: red;">ERROR</span>');
                response.reject();
                return;
            }
            portUsageStart();

            backgroundPage.serialConnectionId = connectionInfo.connectionId;
            console.log('Connection was opened with ID: ' + backgroundPage.serialConnectionId);
            commandLog('Connection to: ' + serialPort + ' was opened with ID: ' + backgroundPage.serialConnectionId);

            chrome.storage.local.set({'last_used_port': serialPort}, function() {});
            chrome.serial.flush(backgroundPage.serialConnectionId, function() {});

            // request configuration data (so we have something to work with)
            deviceConfig.request();
            response.resolve();
        }

        function connect(serialPort) {
            var response = $q.defer();
            chrome.serial.connect(
                serialPort, {
                    bufferSize: 4096 * 5,
                    bitrate: 230400  // doesn't matter for USB
                },
                function(connectionInfo) {
                    onConnectCallback(connectionInfo, serialPort, response);
                });
            return response.promise;
        }

        function onDisconnectCallback(result, response) {
            if (result) {  // All went as expected
                console.log('Connection closed successfully.');
                command_log('Connection closed -- <span style="color: green;">OK</span>');

                backgroundPage.serialConnectionId = -1;  // reset connection id

                portUsageStop();

                response.resolve();
            } else {  // Something went wrong
                if (backgroundPage.serialConnectionId > 0) {
                    console.log('There was an error that happened during "connection-close" procedure.');
                    command_log('Connection closed -- <span style="color: red;">ERROR</span>');
                }
                response.reject();
            }
        }

        function disconnect() {
            var response = $q.defer();
            if (backgroundPage.serialConnectionId > 0) {
                chrome.serial.disconnect(backgroundPage.serialConnectionId, function(result) {
                    onDisconnectCallback(result, response);
                });
            } else {
                response.reject();
            }
            return response.promise;
        }

        function byteNinNum(data, n) {
            return (data >> (8 * n)) & 0xFF;
        }

        function sendMessage(mask, data, log_send) {
            if (log_send === undefined)
                log_send = true;

            var response = $q.defer();

            if (backgroundPage.serialConnectionId < 0) {  // if there is no serial connection
                response.reject('No serial connection established');
                return response.promise;
            }

            mask |= parser.CommandFields.COM_REQ_RESPONSE;  // force responses

            var checksum = 0;
            var bufferOut, bufView;

            // always reserve 1 byte for protocol overhead !
            if (typeof data === 'object') {
                var size = 7 + data.length;
                bufView = new Uint8Array(size);
                checksum ^= bufView[1] = parser.MessageType.Command;
                for (var i = 0; i < 4; ++i)
                    checksum ^= bufView[i + 2] = byteNinNum(mask, i);
                for (var i = 0; i < data.length; i++)
                    checksum ^= bufView[i + 6] = data[i];
            } else {
                bufferOut = new ArrayBuffer(8);
                bufView = new Uint8Array(bufferOut);
                checksum ^= bufView[1] = parser.MessageType.Command;
                for (var i = 0; i < 4; ++i)
                    checksum ^= bufView[i + 2] = byteNinNum(mask, i);
                checksum ^= bufView[6] = data;  // payload
            }
            bufView[0] = checksum;  // crc
            bufView[bufView.length - 1] = 0;

            acknowledges.push({
                mask: mask,
                response: response,
            });

            $timeout(function() {
                chrome.serial.send(backgroundPage.serialConnectionId, cobs.encode(bufView), function(writeInfo) {});
            }, 1);

            if (log_send) {
                commandLog('Sending command <span style="color:blue">' + parser.MessageType.Command + '</blue>');
            }

            return response.promise;
        }

        function acknowledge(mask, value) {
            while (acknowledges.length > 0) {
                var v = acknowledges.shift();
                if (v.mask !== mask) {
                    v.response.reject('Missing ACK');
                    continue;
                }
                if ((mask & ~parser.CommandFields.COM_REQ_RESPONSE) !== value) {
                    v.response.reject('Request was not fully processed');
                    break;
                }
                v.response.resolve();
                break;
            }
        }

        var onStateListener = function() {};
        var onCommandListener = function() {};

        function onState(callback) {
            onStateListener = callback;
        }

        function onCommand(callback) {
            onCommandListener = callback;
        }

        var cobsReader = new cobs.Reader(2000);

        function processData(command, mask, message_buffer) {
            parser.processBinaryDatastream(command, mask, message_buffer, onStateListener, acknowledge);
        };

        function onSerialReadData(data) {
            char_counter += data.length;

            if (data_mode === "serial") {
                cobsReader.AppendToBuffer(data, processData);
            } else if (data_mode === "capture") {
                capture_mode_callback(data);
            } else if (data_mode === "replay") {
                cobsReader.AppendToBuffer(data, processData);
            } else if (data_mode === "idle") {
                console.log("ERROR: serial port should be closed if we're in 'idle' mode");
            } else {
                console.log("ERROR: unknown data_mode");
            }
        }

        function onSerialRead(readInfo) {
            if (readInfo && (readInfo.connectionId === backgroundPage.serialConnectionId) && readInfo.data)
                onSerialReadData(new Uint8Array(readInfo.data));
        }
        chrome.serial.onReceive.addListener(onSerialRead);

        function onSerialReadError(readInfo) {
            if (readInfo)
                console.log("SERIAL ERROR:", readInfo.connectionId, readInfo.error);
            disconnect();
        };
        chrome.serial.onReceiveError.addListener(onSerialReadError);

        send_message = sendMessage;  // TODO: gradually remove any non-AngularJS serial use

        function getDevices() {
            return $q(function(resolve, reject) {
                chrome.serial.getDevices(resolve);
            });
        }

        return {
            getDevices: getDevices,
            connect: connect,
            disconnect: disconnect,
            send: sendMessage,
            field: parser.CommandFields,
            read: onSerialReadData,
            setStateCallback: onState,
            setCommandCallback: onCommand,  // TODO: still unused, should be fixed in the future
        };
    };

    angular.module('flybrixApp').factory('serial', ['$q', '$timeout', '$interval', 'cobs', 'commandLog', 'parser', 'deviceConfig', serialFactory]);
}());
