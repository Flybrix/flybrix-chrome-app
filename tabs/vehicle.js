(function() {
    'use strict';

    var vehicleController = function($scope, $rootScope, $timeout, deviceConfig, serial) {

        var magnetometer_estimate = [0, 0, 0, 0];
        var magnetometer_estimate_points = [];

        function calculateMagnetometerEstimatePoint(state) {
            var magx = state.mag[0] + $rootScope.eepromConfig.magBias[0];
            var magy = state.mag[1] + $rootScope.eepromConfig.magBias[1];
            var magz = state.mag[2] + $rootScope.eepromConfig.magBias[2];

            magnetometer_estimate_points.push([magx, magy, magz]);
        }

        $scope.adjustMagnetometerEstimate = function() {
            var pointLimit = 500;
            if (magnetometer_estimate_points.length > pointLimit)
                magnetometer_estimate_points = magnetometer_estimate_points.slice(-pointLimit);
            for (var i = 0; i < 10000; ++i) {
                magnetometer_estimate = sphereMinimize(magnetometer_estimate, magnetometer_estimate_points);
                var iterate = magnetometer_estimate.improved;
                magnetometer_estimate = magnetometer_estimate.value;
                if (magnetometer_estimate[3] < 1e-3)
                    magnetometer_estimate[3] = 1e-3;
                if (!iterate)
                    break;
            }

            $scope.magSphere = {
                position: {
                    x: magnetometer_estimate[0],
                    y: magnetometer_estimate[1],
                    z: magnetometer_estimate[2],
                },
                scale: magnetometer_estimate[3],
            };
        };

        $scope.applyBiasFix = function() {
            $rootScope.eepromConfig.magBias = magnetometer_estimate.slice(0, 3).map(function(v) {
                return -v;
            });
            deviceConfig.send($rootScope.eepromConfig);
        };

        var last_time = new Date();
        $rootScope.$watch('state', function(state) {
            if (state === undefined)
                return;
            calculateMagnetometerEstimatePoint(state);

            $scope.vehicleSignalLights.forEach(function(v) {
                v.off = !(state.status & v.mask);
            });
        });

        $scope.drawVehicle = false;
        $scope.vehicleSignalLights = [
            {mask: 1 << 0, label: 'BOOT', off: true},
            {mask: 1 << 1, label: 'MPU FAIL', off: true},
            {mask: 1 << 2, label: 'BMP FAIL', off: true},
            {mask: 1 << 3, label: 'RX FAIL', off: true},
            {mask: 1 << 4, label: 'IDLE', off: true},
            {mask: 1 << 5, label: 'ENABLING', off: true},
            {mask: 1 << 6, label: 'CLEAR MPU BIAS', off: true},
            {mask: 1 << 7, label: 'SET MPU BIAS', off: true},
            {mask: 1 << 8, label: 'STABILITY FAIL', off: true},
            {mask: 1 << 9, label: 'ANGLE FAIL', off: true},
            {mask: 1 << 10, label: 'ENABLED', off: true},
            {mask: 1 << 11, label: 'LOW BATTERY', off: true},
            {mask: 1 << 12, label: 'TEMP WARNING', off: true},
            {mask: 1 << 13, label: 'LOG IS FULL', off: true},
            {mask: 1 << 14, label: 'UNPAIRED', off: true},
            {mask: 1 << 15, label: 'OVERRIDE', off: true},
        ];
    };

    var app = angular.module('flybrixApp');

    app.controller('vehicleController', ['$scope', '$rootScope', '$timeout', 'deviceConfig', 'serial', vehicleController]);
}());
