(function() {
    'use strict';

    var ledController = function($scope, serial) {
        function hexToRgb(hex) {
            var rgb = /^#([\dA-Fa-f]{2})([\dA-Fa-f]{2})([\dA-Fa-f]{2})$/.exec(hex);
            if (!rgb)
                rgb = [null, '0', '0', '0'];
            return {
                r: parseInt(rgb[1], 16),
                g: parseInt(rgb[2], 16),
                b: parseInt(rgb[3], 16),
            };
        }

        $scope.$watch('led', function() {
            updateColors();
        }, true);

        function updateColors() {
            var l = hexToRgb($scope.led.light.left);
            var r = hexToRgb($scope.led.light.right);
            var message = new Uint8Array([
                $scope.led.mode,
                r.r,
                r.g,
                r.b,
                l.r,
                l.g,
                l.b,
                $scope.led.indicator.red,
                $scope.led.indicator.green,
            ]);
            serial.send(CommandFields.COM_SET_LED, message, false);
        }

        $scope.ledModes = [
            {name: 'No override', code: 0},
            {name: 'Flash', code: 1},
            {name: 'Beacon', code: 2},
            {name: 'Breathe', code: 3},
            {name: 'Alternate', code: 4},
            {name: 'Solid light', code: 5},
        ];

        $scope.led = {
            mode: 0,
            indicator: {
                green: false,
                red: false,
            },
            light: {
                left: '#000000',
                right: '#000000',
            },
        };
    };

    var app = angular.module('flybrixApp');

    app.controller('ledController', ['$scope', 'serial', ledController]);

    app.directive('colorPicker', function() {
        var link = function(scope, element, attr, ngModel) {
            var latestUpdate = new Date();

            element.spectrum({
                flat: true,
                preferredFormat: "hex",
                showInput: true,
                showButtons: false,
                color: "black",
                clickoutFiresChange: false,
                change: function(color) {
                    ngModel.$setViewValue('#' + color.toHex());
                },
                move: function(color) {
                    var newTime = new Date();
                    if (newTime - latestUpdate < 50) {  // up to 20 updates per second
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

function initialize_led_view() {
}


function refresh_led_view_from_eepromConfig() {
}
