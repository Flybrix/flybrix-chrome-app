(function() {
    'use strict';

    var config = function($compileProvider) {
        // chrome-extension needs to be added to URL sanitization: http://goo.gl/wHruHL
        var currentImgSrcSanitizationWhitelist = $compileProvider.imgSrcSanitizationWhitelist();
        var newImgSrcSanitizationWhiteList = currentImgSrcSanitizationWhitelist.toString().slice(0, -1) + '|chrome-extension:' + currentImgSrcSanitizationWhitelist.toString().slice(-1);
        $compileProvider.imgSrcSanitizationWhitelist(newImgSrcSanitizationWhiteList);
    };

    angular.module('flybrixApp', ['firebase', 'pdf']).config(['$compileProvider', config]);
}());
