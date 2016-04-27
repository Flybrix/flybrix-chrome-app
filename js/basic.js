(function() {
    'use strict';

    var basicController = function($scope, $rootScope) {
        $scope.models = [
            {
              label: 'Quad',
              url: './models/flyer_assembly_xquad_small.stl',
            },
            {
              label: 'Hexa',
              url: './models/flyer_assembly_hexa_small.stl',
            },
            {
              label: 'Octa',
              url: './models/flyer_assembly_octa_small.stl',
            },
        ];
    };

    angular.module('flybrixApp').controller('basicController', ['$scope', '$rootScope', basicController]);
}());
