var setTargetDelay;
var old_data_mode;

function initialize_datastream_view() {
};

(function() {
    'use strict';

    function rate_from_delay(delay) {
        if (delay > 1000) {
            return 0;
        }
        if (delay == 0) {
            return 1000;
        }
        return 1000 / delay;
    }

    var datastreamController = function($scope, $rootScope, $interval, filehandler, commandLog, serial) {
        $interval(function() {
            $scope.slowState = $rootScope.state;
            $scope.slowStateUpdateRate = $rootScope.stateUpdateRate;
            $scope.modelChangeMask = $rootScope.stateDataMask;
        }, 150);  // throttle redraw to 6-7Hz

        $scope.modelChangeMask = [];

        $scope.changeMask = function() {
            var mask = $scope.modelChangeMask.reduce(function(acc, val, idx) {
                return acc + (val ? (1 << idx) : 0);
            });
            var bytes = [mask % 0x100, (mask >> 8) % 0x100, (mask >> 16) % 0x100, (mask >> 24) % 0x100];  // little endian
            console.log(bytes);
            serial.send(serial.field.COM_SET_STATE_MASK, new Uint8Array(bytes));
        };

        $scope.$watch('targetDelay', function(value) {
            if (value === undefined)
                return;
            $scope.targetRate = rate_from_delay(value);
            var bytes = [value % 256, value / 256];  // little endian
            serial.send(serial.field.COM_SET_STATE_DELAY, new Uint8Array(bytes));
        });

        setTargetDelay = function(delay) {
            $scope.$apply(function() {
                $scope.targetDelay = delay;
            });
        };


        var chosenEntry = null;
        var accumulatedBlob = new Blob();
        var lastBlobWrite = new Date();

        $scope.captureModeFilehandler = {
            start: function(entry) {
                if (data_mode === "capture")
                    return;
                commandLog('Changing to capture mode.');
                if (chosenEntry !== entry) {
                    chosenEntry = entry;
                    accumulatedBlob = new Blob();
                }

                capture_mode_callback = function(data) {
                    var currentTime = new Date();
                    accumulatedBlob = new Blob([accumulatedBlob, data]);
                    if (currentTime - lastBlobWrite < 5000)
                        return;
                    lastBlobWrite = currentTime;
                    filehandler.writeData(chosenEntry, accumulatedBlob);
                };

                old_data_mode = data_mode;
                data_mode = "capture";

            },
            stop: function(entry) {
                if (data_mode !== "capture")
                    return;
                commandLog('Closing capture mode and returning to ' + old_data_mode);
                filehandler.writeData(chosenEntry, accumulatedBlob);
                data_mode = old_data_mode;
            },
        };
    };

    angular.module('flybrixApp').controller('datastreamController', ['$scope', '$rootScope', '$interval', 'filehandler', 'commandLog', 'serial', datastreamController]);
}());
