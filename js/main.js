/*
 *  Flybrix Configurator -- Copyright 2015 Flying Selfie Inc.
 *
 *  License and other details available at: http://www.flybrix.com/configurator
 *

Credit is due to several other projects, including:
- multiwii ("https://github.com/multiwii")
- phoenix flight controller ("https://github.com/cTn-dev/Phoenix-FlightController")

 */

$(document)
    .ready(function() {
        chrome.app.window.current().outerBounds.maxHeight = 0;
        chrome.app.window.current().outerBounds.maxWidth = 0;
    });  // document ready

(function() {
    'use strict';

    function diff(A, B) {
        var out = [];

        // create hardcopy
        for (var i = 0; i < A.length; i++) {
            out.push(A[i]);
        }

        for (var i = 0; i < B.length; i++) {
            if (out.indexOf(B[i]) != -1) {
                out.splice(out.indexOf(B[i]), 1);
            }
        }
        return out;
    }

    var mainController = function($scope, $rootScope, $window, $timeout, $interval, serial, commandLog, deviceConfig) {
        var tabClick = function(tab) {
            var titlestr = tab.label;
            var href = '#' + tab.url;

            if (!tab.initialized) {
                tab.initialized = true;
                tab.open = false;

                $(href)
                    .dialog({
                        modal: false,
                        height: 800,
                        width: 1100,
                        title: titlestr,
                        position: {
                            my: "top",
                            at: "bottom",
                            of: $('#menu.tab-button-bar'),
                        }
                    });

                $(href)
                    .parent()
                    .draggable({
                        containment: [0, 0, 2000, 2000],
                    });

                var close_button_selector = $(href).parent().children('.ui-dialog-titlebar').children('button');
                $(close_button_selector)
                    .click(function(event) {
                        console.log('hide dialog', href, tab.open);
                        event.preventDefault();
                        setTimeout(function() {
                            $(href).parent().css({display: "none"});
                            tab.open = false;
                        }, 1);
                    });

                // start by showing dialog
                tab.open = true;
                // jquery ui starts out with the close button focused...
                $('.ui-dialog :button').blur();
            }

            if (!tab.open) {  // dialog is hidden, show now
                var parent_selector = $(href).parent();
                console.log('show dialog', href);
                setTimeout(function() {
                    $(href).parent().css({display: "block"});
                    tab.open = true;
                }, 1);
            }

            // bring tab to the front
            setTimeout(function() {
                $(href).parent().children('.ui-dialog-titlebar').mousedown()
            }, 20);

        };

        $scope.devices = [];
        $scope.deviceChoice = undefined;

        function disconnectSerialIfSamePath(devices, path) {
            var serialPath = serial.getPath();
            var connectedPort = devices.find(function(val) {
                return val === serialPath;
            });
            if (connectedPort !== undefined)
                $scope.disconnect();
        }

        function refreshPortSelector() {
            serial.getDevices().then(function(ports) {
                var devices = ports.map(function(port) {
                    return port.path;
                });

                var diffPorts = diff($scope.devices, devices);
                if (diffPorts.lenght > 0) {
                    console.log('Ports unplugged:', diff_ports);
                }
                diffPorts = diff(devices, $scope.devices);
                if (diffPorts.lenght > 0) {
                    console.log('Ports found:', diff_ports);
                }
                $scope.devices = devices;
            });
        }

        $scope.isConnected =
            function() {
            return serial.isConnected();
        }

        var initial_config_request;

        $scope.connect = function() {
            console.log('Connecting to: ' + $scope.deviceChoice);

            var onSuccess = function() {
                initial_config_request = $timeout(function() {
                    // request configuration data (so we have something to work with)
                    deviceConfig.request();

                    // set the state message mask and frequency
                    $timeout(function() {
                        var default_delay_msec = 50;

                        serial.send(serial.field.COM_SET_STATE_MASK | serial.field.COM_SET_STATE_DELAY, new Uint8Array([255, 255, 255, 255, default_delay_msec % 256, default_delay_msec / 256]));
                        // update fields in datastream tab
                        $rootScope.targetDelay = default_delay_msec;
                    }, 100);

                }, 500);
            };

            serial.connect($scope.deviceChoice).then(onSuccess);
        };

        $scope.disconnect = function() {
            console.log('Disconnecting from: ' + serial.getPath());

            serial.disconnect();

            // if we disconnect before we ask for initial config data
            $timeout.cancel(initial_config_request);

            // Reset port usage indicator to 0
            $('span.port-usage').html(0 + ' kbps');  // TODO: handle this more elegantly
        };

        $scope.tabs = [
            {url: 'tuning', label: 'Tuning'},
            {url: 'sensors', label: 'Sensor Data'},
            {url: 'signals', label: 'R/C Signals'},
            {url: 'vehicle', label: 'Vehicle View'},
            {url: 'motors', label: 'Motors'},
            {url: 'led', label: 'LED'},
            {url: 'datastream', label: 'Datastream'},
            {url: 'config', label: 'Configuration'},
            {url: 'log', label: 'Log'},
        ];

        $scope.tabClick = tabClick;

        $rootScope.updateEeprom =
            function() {
            deviceConfig.send($rootScope.eepromConfig);
        }

            serial.setStateCallback(function(state, state_data_mask, serial_update_rate) {
                $timeout(function() {
                    $rootScope.state = state;
                    $rootScope.stateDataMask = state_data_mask;
                    $rootScope.stateUpdateRate = serial_update_rate;
                }, 0);
            });

        deviceConfig.setConfigCallback(function() {
            $rootScope.$apply(function() {
                $rootScope.eepromConfig = deviceConfig.getConfig();
            });
        });

        $rootScope.$watch('state', function() {
            if (!$rootScope.state)
                return;

            var kV0 = (20.5 + 226) / 20.5 * 1.2 / 65536;
            var kI0 = 1000 * (1 / 50) / 0.003 * 1.2 / 65536;
            var kI1 = 1000 * (1 / 50) / 0.03 * 1.2 / 65536;

            $rootScope.batteryData = [
                kV0 * $rootScope.state.V0_raw,
                kI0 * $rootScope.state.I0_raw,
                kI1 * $rootScope.state.I1_raw,
                kI0 * kV0 * $rootScope.state.V0_raw * $rootScope.state.I0_raw,
                kI1 * kV0 * $rootScope.state.V0_raw * $rootScope.state.I1_raw,
            ];
        });

        $scope.$watch('devices', function(devices) {
            disconnectSerialIfSamePath(devices, serial.getPath());
            if ($scope.deviceChoice === undefined) {
                chrome.storage.local.get('last_used_port', function(result) {
                    $scope.deviceChoice = result.last_used_port;
                });
            }
        }, true);

        function autoConnectIfExists() {
            if (!$scope.autoConnect)
                return;
            var chosenDevice = $scope.devices.find(function(elem) {
                return elem === $scope.deviceChoice;
            });
            console.log("CHOSEN DEVICE", chosenDevice);
            if (chosenDevice === undefined)
                return;
            $scope.connect();
        }

        $scope.$watch('deviceChoice', autoConnectIfExists);

        chrome.storage.local.get('auto_connect', function(result) {
            if (result.auto_connect === 'undefined' || result.auto_connect) {
                $scope.autoConnect = true;
            } else {
                $scope.autoConnect = false;
            }
        });

        $scope.$watch('autoConnect', function(val) {
            if (val === undefined)
                return;
            chrome.storage.local.set({'auto_connect': val});
            autoConnectIfExists();
        });

        $scope.$watch('dataSource', function() {
            // terminate all data sources
            $scope.disconnect();
            fireOffStop();
        });

        $interval(refreshPortSelector, 200);

        $scope.dataSource = 'serial';

        function setReplayPosition(position) {
            $scope.datastreamReplay.replayPoint = position;
            $('.datastream-replay .slider').slider("value", position);
            $('.datastream-replay .datastream-report').html(position);
        }

        $scope.datastreamReplay = {
            dataRate: 100,
        };

        function fireOffStop() {
            $interval.cancel($scope.datastreamReplay.interval);
        }

        function simulateData(inputData, tickDelay) {
            if (inputData.length < 1) {
                setReplayPosition(0);
                fireOffStop();
                return;
            }
            var dataLength = Math.ceil($scope.datastreamReplay.dataRate * (tickDelay / 8));
            serial.read(inputData.slice(0, dataLength));
            setReplayPosition($scope.datastreamReplay.replayPoint + dataLength);
        }

        function checkVersion(ver) {
            var flybrix_app_configuration_version = deviceConfig.getDesiredVersion();
            if (ver === flybrix_app_configuration_version)
                return true;
            if (ver == null || flybrix_app_configuration_version == null)
                return false;
            if (ver.length !== flybrix_app_configuration_version.length)
                return false;
            for (var i = 0; i < ver.length; ++i)
                if (ver[i] !== flybrix_app_configuration_version[i])
                    return false;
            return true;
        }

        $scope.datastreamReplay.open = function() {
            var accepts = [{mimeTypes: ['text/*'], extensions: ['dat', 'csv', 'txt', 'bin', 'log', 'raw']}];
            var file_textbox_selector = $('.datastream-replay .filename');
            chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(chosenEntry) {
                if (!chosenEntry) {
                    $('.datastream-replay .filename').html('No File Selected!');
                    return;
                }
                // read all contents into replay buffer //TODO worry about size...
                chosenEntry.file(function(file) {
                    var reader = new FileReader();
                    reader.onerror = function(e) {
                        console.error(e);
                    };
                    reader.onloadend = function(e) {
                        try {
                            var dataObject = JSON.parse(reader.result);
                            if (!('version' in dataObject))
                                throw "File is missing the 'version' field";
                            if (!('config' in dataObject))
                                throw "File is missing the 'config' field";
                            if (!('data' in dataObject))
                                throw "File is missing the 'data' field";
                            if (!checkVersion(dataObject.version))
                                throw "The requested recording is made on an old firmware version";
                            $scope.datastreamReplay.replayBuffer = new Uint8Array(atob(dataObject.data).split("").map(function(c) {
                                return c.charCodeAt(0);
                            }));
                            $scope.datastreamReplay.replayPoint = 0;
                        } catch (err) {
                            commandLog('Read <span style="color: red;">FAILED</span>: ' + err);
                            console.log('Read FAILED, error:', err);
                            return;
                        }

                        commandLog('Read <span style="color: green;">SUCCESSFUL</span>');
                        console.log('Read SUCCESSFUL');

                        $('.datastream-replay .datastream-report').html("Loaded " + $scope.datastreamReplay.replayBuffer.length + " bytes.");
                        $('.datastream-replay .slider').slider("option", "disabled", false);
                        $('.datastream-replay .slider').slider("option", "max", $scope.datastreamReplay.replayBuffer.length);
                    };
                    reader.readAsText(file);
                });

                chrome.fileSystem.getDisplayPath(chosenEntry, function(displayPath) {
                    $('.datastream-replay .filename').html(displayPath);
                });
            });
        };

        $scope.datastreamReplay.play = function() {
            // drive everything via the slider value update -- send a chunk of bytes and then advance on a timer.

            //$('.datastream-replay .slider').slider( "option", "value", replay_buffer.length );
            $scope.datastreamReplay.interval = $interval(function() {
                simulateData($scope.datastreamReplay.replayBuffer.slice($scope.datastreamReplay.replayPoint), 50);
            }, 50);
        };

        $scope.datastreamReplay.pause = function() {
            // stop playing
            fireOffStop();
        };

        $scope.datastreamReplay.stop = function() {
            // stop playing
            fireOffStop();
            setReplayPosition(0);
        };

        // replay datastream setup
        $('.datastream-replay .slider')
            .slider({
                value: 0,
                min: 0,
                max: 100,
                disabled: true,
                start: function(event, ui) {
                    // pause playback while we're moving the marker
                    //$('.datastream-replay .datastream-report').html(ui.value);

                    fireOffStop();
                },
                stop: function(event, ui) {
                    setReplayPosition(ui.value);
                },
            });
        //  https://api.jqueryui.com/slider/

        $scope.commandLogClick = function() {
            var loglines = document.getElementById('command-log').innerHTML.split('<p>');
            var str = "";
            for (var i = 0; i < loglines.length; i++) {
                str += $('<p>' + loglines[i]).text() + '\n';
            }
            console.log(str);
        };

        $scope.goToForums = function() {
            $window.open('https://flybrix.com/pages/flybrix-user-forum', '_blank');
        };

        $rootScope.eepromConfig = deviceConfig.getConfig();

        $scope.$watch('viewMode', function(mode) {
            if (mode != 'advanced')
                $scope.dataSource = 'serial';
        });

        $scope.viewMode = 'basic';

        $scope.models = [
            {
              label: 'X Quad',
              image: './models/x quad.JPG',
              model: './models/builds/x quad.json',
              url: './models/flyer_assembly_xquad_small.STL',
              pdf: './pdfs/flyer_assembly_xquad_small.pdf',
            },
            {
              label: 'Hex',
              image: './models/flat6 hex.JPG',
              pdf: './pdfs/pp2.pdf',
            },
            {
              label: 'Octo',
              image: './models/flat8 octo.JPG',
              pdf: './pdfs/pp3.pdf',
            },
        ];

        $scope.setPdfChoice = function(choice) {
            $scope.pdfUrl = choice.pdf;
        };
    };

    var app = angular.module('flybrixApp');

    app.factory('commandLog', function() {
        function command_log(message) {
            var d = new Date();
            var time = ((d.getHours() < 10) ? '0' + d.getHours() : d.getHours()) + ':' + ((d.getMinutes() < 10) ? '0' + d.getMinutes() : d.getMinutes()) + ':' +
                ((d.getSeconds() < 10) ? '0' + d.getSeconds() : d.getSeconds()) + ':' +
                ((d.getMilliseconds() < 100) ? '0' + ((d.getMilliseconds() < 10) ? '0' + d.getMilliseconds() : d.getMilliseconds()) : d.getMilliseconds())

                    var html = '<p>' + time + ' -- ' + message + '</p>';
            $('.command-log').append(html);
            var bottom = $('.command-log')[0].scrollHeight - $('.command-log').height();
            setTimeout(function() {
                $('.command-log').animate({scrollTop: bottom}, 500, function() {});
            }, 1);
        }
        return command_log;
    });

    app.controller('mainController', ['$scope', '$rootScope', '$window', '$timeout', '$interval', 'serial', 'commandLog', 'deviceConfig', mainController]);

    app.directive('eepromInput', function() {
        return {
            template:
                '<label class="model-entry-label">{{label}}<input class="model-entry-field" type="number" step="{{precision}}" ng-model="field" ng-model-options="{updateOn:\'change\'}" ng-change="onChange()"></input></label>',
            scope: true,
            require: '?ngModel',
            priority: 1,
            link: function(scope, element, attrs, ngModel) {
                if (!ngModel)
                    return;

                scope.onChange = function() {
                    ngModel.$setViewValue(scope.field);
                    scope.$root.updateEeprom();
                };

                ngModel.$render = function() {
                    if (attrs.precision !== undefined)
                        scope.precision = parseFloat(attrs.precision);
                    else
                        scope.precision = 0;
                    if (ngModel.$modelValue !== undefined)
                        scope.field = parseFloat(ngModel.$modelValue.toFixed(scope.precision));
                    scope.label = attrs.label;
                };
            },
        };
    });
}());
