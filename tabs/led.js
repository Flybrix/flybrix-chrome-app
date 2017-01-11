(function() {
    'use strict';

    var ledController = function($scope, led) {
        function hexToRgb(hex) {
            var rgb =
                /^#([\dA-Fa-f]{2})([\dA-Fa-f]{2})([\dA-Fa-f]{2})$/.exec(hex);
            if (!rgb)
                rgb = [null, '0', '0', '0'];
            return {
                red: parseInt(rgb[1], 16),
                green: parseInt(rgb[2], 16),
                blue: parseInt(rgb[3], 16),
            };
        }

        $scope.ledState = {
            mode: 5,
            front_left: '#ffffff',
            front_right: '#ffffff',
            rear_left: '#ffffff',
            rear_right: '#ffffff',
            red: false,
            green: false,
        };

        $scope.$watchCollection('ledState', function(v) {
            led.set(
                hexToRgb(v.front_right), hexToRgb(v.rear_right),
                hexToRgb(v.front_left), hexToRgb(v.rear_left), v.mode, v.red,
                v.green);
        });

        $scope.ledModes = [
            {name: 'Flash', code: 1},
            {name: 'Beacon', code: 2},
            {name: 'Breathe', code: 3},
            {name: 'Alternate', code: 4},
            {name: 'Solid light', code: 5},
        ];
    };

    var app = angular.module('flybrixApp');

    app.controller('ledController', ['$scope', 'led', ledController]);

    app.directive('colorPicker', function() {
        var link = function(scope, element, attr, ngModel) {
            var latestUpdate = new Date();

            element.spectrum({
                flat: true,
                preferredFormat: 'hex',
                showInput: true,
                showButtons: false,
                color: 'black',
                clickoutFiresChange: false,
                change: function(color) {
                    ngModel.$setViewValue('#' + color.toHex());
                },
                move: function(color) {
                    var newTime = new Date();
                    if (newTime - latestUpdate <
                        50) {  // up to 20 updates per second
                        return;
                    }
                    latestUpdate = newTime;
                    ngModel.$setViewValue('#' + color.toHex());
                },
            });

            ngModel.$render(function() {
                element.spectrum('set', ngModel.$viewValue);
            });
        };

        return {
            require: '?ngModel',
            priority: 1,
            link: link,
        };
    });
}());
