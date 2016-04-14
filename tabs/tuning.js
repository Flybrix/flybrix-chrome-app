
function initialize_tuning_view() {
}

(function() {
    'use strict';

    var tuningController = function($scope, $rootScope, deviceConfig) {
        $scope.getPidValues = function(value) {
            if (!value)
                return [];
            return [
                value[2],
                value[1],
                value[3],
                value[4],
                value[5],
                value[3] + value[4] + value[5],
            ];
        };

        $scope.tunerLabels = [
            'Proportional Gain',
            'Integral Gain',
            'Derivative Gain',
            'Integral Limit',
            'Derivative Filter',
            'Setpoint Filter',
        ];

        $scope.bypasses = [0, 0, 0, 0, 0, 0, 0, 0];

        $scope.onBypassChange = function() {
            $rootScope.eepromConfig.pidBypass = $scope.bypasses.reduce(function(acc, val, idx) {
                return acc + (val ? (1 << idx) : 0);
            }, 0);
            deviceConfig.send($rootScope.eepromConfig);
        };

        $rootScope.$watch('eepromConfig.pidBypass', function(value) {
            $scope.bypasses.forEach(function(val, idx) {
                $scope.bypasses[idx] = (value & (1 << idx)) != 0;
            });
        });
    };

    angular.module('flybrixApp').controller('tuningController', ['$scope', '$rootScope', 'deviceConfig', tuningController]);
}());
