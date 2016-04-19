(function() {
    'use strict';

    var motorsController = function($scope, $rootScope, $interval, serial) {
        function update_bar_css(index, type, val) {
            // if newval = +4096 --> top is 0, height is 128
            // if newval = -2047 --> top is 128, height is 64
            var top_px = 128;
            var height_px = 1;
            if (val > 4) {
                height_px = val * 128 / 4096;
                top_px = 128 - height_px;
            }
            if (val < -4) {
                height_px = val * -128 / 4096;
                top_px = 128;
            }
            $('.' + index + ' .motor-view-level-bar-' + type).css({'top': top_px + 'px', 'height': height_px + 'px'});
        }


        var last_motors_view_update = new Date();
        $scope.$watch('state', function() {
            if (!$rootScope.state || !$rootScope.eepromConfig)
                return;

            $scope.motorsEnabledNeg = !($rootScope.state.status & 0x0400);
            $scope.motorsOverrideNeg = !($rootScope.state.status & 0x8000);

            var now = new Date();
            if (now - last_motors_view_update > graph_update_delay) {  // throttle redraw to 20Hz
                for (var i = 0; i < 8; i++) {
                    update_bar_css(i, 'Fz', $rootScope.state.control[0] * $rootScope.eepromConfig.mixTableFz[i] / Math.max.apply(null, $rootScope.eepromConfig.mixTableFz));
                    update_bar_css(i, 'Tx', $rootScope.state.control[1] * $rootScope.eepromConfig.mixTableTx[i] / Math.max.apply(null, $rootScope.eepromConfig.mixTableTx));
                    update_bar_css(i, 'Ty', $rootScope.state.control[2] * $rootScope.eepromConfig.mixTableTy[i] / Math.max.apply(null, $rootScope.eepromConfig.mixTableTy));
                    update_bar_css(i, 'Tz', $rootScope.state.control[3] * $rootScope.eepromConfig.mixTableTz[i] / Math.max.apply(null, $rootScope.eepromConfig.mixTableTz));
                    update_bar_css(i, 'sum', $rootScope.state.MotorOut[i]);
                    if (!$scope.motorFocused[i])
                        $scope.motorValue[i] = $rootScope.state.MotorOut[i];
                }
                last_motors_view_update = now;
            }

        });

        $scope.overridePilot = function() {
            serial.send(serial.field.COM_SET_COMMAND_OVERRIDE, ($scope.motorsOverrideNeg ? 1 : 0));
        };

        $scope.enableMotors = function() {
            if ($scope.motorsEnabledNeg) {
                console.log('enabling motors');
                var i = 0;
                $interval(function() {
                    serial.send(serial.field.COM_REQ_ENABLE_ITERATION, 1, i++ === 81);
                }, 10, 82);
            } else {
                console.log('disabling motors');
                serial.send(serial.field.COM_REQ_ENABLE_ITERATION, 0);
            }
        };

        $scope.zeroMotors = function() {
            console.log('zero motors');
            serial.send(serial.field.COM_MOTOR_OVERRIDE_SPEED_ALL, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        };

        $scope.changeMotorValue = function(index) {
            console.log('Change value of motor', index);
            var motor_v = $scope.motorValue[index];  // motor value
            serial.send(serial.field.COM_MOTOR_OVERRIDE_SPEED_0 << index, [motor_v % 256, motor_v / 256]);
        };

        $scope.motorsEnabledNeg = true;
        $scope.motorsOverrideNeg = true;
        $scope.motorValue = [0, 0, 0, 0, 0, 0, 0, 0];
        $scope.motorFocused = [false, false, false, false, false, false, false, false];
    };

    angular.module('flybrixApp').controller('motorsController', ['$scope', '$rootScope', '$interval', 'serial', motorsController]);
}());
