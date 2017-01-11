(function() {
    'use strict';

    var designController = function(
        $scope, deviceConfig, commandLog, presets, firmwareVersion) {
        $scope.models = [
            {
              label: 'xquad',
              image: './models/x quad.JPG',
              model: './models/builds/x quad.json',
              url: './models/flyer_assembly_xquad_small.STL',
              pdf: './pdfs/xquad.pdf',
              id: 0,
            },
            {
              label: 'flat6',
              image: './models/flat6 hex.JPG',
              model: './models/builds/hex.json',
              pdf: './pdfs/flat6.pdf',
              id: 1,
            },
            {
              label: 'flat8',
              image: './models/flat8 octo.JPG',
              model: './models/builds/octo.json',
              pdf: './pdfs/flat8.pdf',
              id: 2,
            },
        ];

        $scope.sendConfigDefault = function(model) {
            commandLog('Sending default configuration data for ' + model.label);

            if (!firmwareVersion.supported()) {
                commandLog(
                    'Firmware version ' + firmwareVersion.key() +
                        ' is <span style="color: red;">NOT SUPPORTED</span>');
                return;
            }
            var new_config = presets.get(model.id);
            console.log(new_config);
            new_config.name = model.label;
            deviceConfig.send(new_config);
        };

        $scope.setPdfChoice = function(choice) {
            $scope.pdfUrl = choice.pdf;
            $scope.sendConfigDefault(choice);
        };
    };

    var app = angular.module('flybrixApp');
    app.controller('designController', [
        '$scope', 'deviceConfig', 'commandLog', 'presets', 'firmwareVersion',
        designController
    ]);

}());
