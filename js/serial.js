(function() {
    'use strict';

    angular.module('flybrixApp').factory('usbSerial', usbSerial);

    usbSerial.$inject = ['$q', '$interval', 'commandLog', 'serial'];

    function usbSerial($q, $interval, commandLog, serial) {
        var last_port_usage_update = 0;
        var char_counter = 0;  // used to keep track of serial port data rate
        var portUsageInterval = null;
        var graphUpdateDelay = 50;

        var backend = new serial.Backend();
        backend.send = sendMessage;
        serial.setBackend(backend);

        chrome.serial.onReceive.addListener(onSerialRead);
        chrome.serial.onReceiveError.addListener(onSerialReadError);

        // Get access to the background window object
        // This object is used to pass current serial port connectionId to the
        // backround page so the onClosed event can close the port for us if it
        // was left opened, without this users can experience weird behavior if
        // they would like to access the serial bus afterwards.
        var backgroundPage = null;

        chrome.runtime.getBackgroundPage(function(result) {
            backgroundPage = result;
            backgroundPage.serialConnectionId = -1;
            backgroundPage.serialPortPath = "";
        });

        return {
            getDevices: getDevices,
            connect: connect,
            disconnect: disconnect,
            read: onSerialReadData,
            getPath: getPath,
            isConnected: isConnected,
            getGraphUpdateDelay: getGraphUpdateDelay,
        };

        function onSerialRead(readInfo) {
            if (readInfo &&
                (readInfo.connectionId === backgroundPage.serialConnectionId) &&
                readInfo.data) {
                onSerialReadData(new Uint8Array(readInfo.data));
            }
        }

        function onSerialReadError(readInfo) {
            if (readInfo) {
                console.log(
                    "SERIAL ERROR:", readInfo.connectionId, readInfo.error);
            }
            disconnect();
        };

        function sendMessage(data) {
            if (isConnected()) {
                chrome.serial.send(
                    backgroundPage.serialConnectionId, data.buffer,
                    function(writeInfo) {});
            }
        }

        function onSerialReadData(data) {
            char_counter += data.length;
            backend.onRead(data);
        }

        function getDevices() {
            return $q(function(resolve, reject) {
                chrome.serial.getDevices(resolve);
            });
        }

        function getPath() {
            if (backgroundPage === null) {
                return "";
            }
            return backgroundPage.serialPortPath;
        }

        function isConnected() {
            return backgroundPage !== null &&
                backgroundPage.serialConnectionId > 0;
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

        function onConnectCallback(connectionInfo, serialPort, response) {
            if (!connectionInfo) {
                console.log(
                    'There was a problem while opening the connection.');
                commandLog(
                    'Could not join the serial bus -- <span style="color: red;">ERROR</span>');
                response.reject();
                return;
            }
            portUsageStart();

            backgroundPage.serialConnectionId = connectionInfo.connectionId;
            backgroundPage.serialPortPath = serialPort;
            console.log(
                'Connection was opened with ID: ' +
                backgroundPage.serialConnectionId);
            commandLog(
                'Connection to: ' + serialPort + ' was opened with ID: ' +
                backgroundPage.serialConnectionId);

            chrome.storage.local.set(
                {'last_used_port': serialPort}, function() {});
            chrome.serial.flush(
                backgroundPage.serialConnectionId, function() {});

            response.resolve();
        }

        function disconnect() {
            var response = $q.defer();
            if (backgroundPage !== null &&
                backgroundPage.serialConnectionId > 0) {
                chrome.serial.disconnect(
                    backgroundPage.serialConnectionId, function(result) {
                        onDisconnectCallback(result, response);
                    });
            } else {
                response.reject();
            }
            return response.promise;
        }

        function onDisconnectCallback(result, response) {
            if (result) {  // All went as expected
                console.log('Connection closed successfully.');
                commandLog(
                    'Connection closed -- <span style="color: green;">OK</span>');

                backgroundPage.serialConnectionId = -1;  // reset connection id
                backgroundPage.serialPortPath = "";

                portUsageStop();

                response.resolve();
            } else {  // Something went wrong
                if (backgroundPage.serialConnectionId > 0) {
                    console.log(
                        'There was an error that happened during "connection-close" procedure.');
                    commandLog(
                        'Connection closed -- <span style="color: red;">ERROR</span>');
                }
                response.reject();
            }
        }

        function portUsageStop() {
            if (!portUsageInterval)
                return;
            $interval.cancel(portUsageInterval);
        }

        function portUsageStart() {
            portUsageStop();
            portUsageInterval = $interval(portUsage, 1000);
        }

        function getGraphUpdateDelay() {
            return graphUpdateDelay;
        }

        function portUsage() {
            var now = Date.now();

            graphUpdateDelay *= 0.8;
            if (graphUpdateDelay < 50) {
                graphUpdateDelay = 50;
            }

            if (last_port_usage_update > 0) {
                // should be 1000 msec, as per setTimeout that calls
                var ui_update_rate = now - last_port_usage_update;

                // throttle back datastream when the UI lags behind to keep
                // things usable
                if (ui_update_rate > 1020) {
                    commandLog(
                        'UI is falling behind -- <span style="color: red;">' +
                        'SLOWING DOWN GRAPH UPDATES</span>');
                    graphUpdateDelay *= 2.0;
                }
                var port_speed_kbps = char_counter / ui_update_rate;
                $('#port-usage').html(port_speed_kbps.toFixed(3) + ' kbps');
            };
            char_counter = 0;
            last_port_usage_update = now;
        }
    }
}());
