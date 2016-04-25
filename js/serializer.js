(function() {
    'use strict';

    var serializer = function() {
        // these functions are used to work with dataviews in eeprom-config.js and in parser.js
        // javascript won't pass primitives by reference
        function byteRef() {
            this.index = 0;
        }
        byteRef.prototype.add = function(increment) {
            this.index += increment;
        };
        function parseFloat32Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                destination[i] = view.getFloat32(byteRef.index, 1);
                byteRef.add(4);
            }
        }
        function parseInt16Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                destination[i] = view.getInt16(byteRef.index, 1);
                byteRef.add(2);
            }
        }
        function parseInt8Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                destination[i] = view.getInt8(byteRef.index, 1);
                byteRef.add(1);
            }
        }
        function parseUint8Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                destination[i] = view.getUint8(byteRef.index, 1);
                byteRef.add(1);
            }
        }
        function parseUint16Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                destination[i] = view.getUint16(byteRef.index, 1);
                byteRef.add(2);
            }
        }
        function setFloat32Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                view.setFloat32(byteRef.index, destination[i], 1);
                byteRef.add(4);
            }
        }
        function setInt8Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                view.setInt8(byteRef.index, destination[i], 1);
                byteRef.add(1);
            }
        }
        function setUint8Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                view.setUint8(byteRef.index, destination[i], 1);
                byteRef.add(1);
            }
        }
        function setUint16Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                view.setUint16(byteRef.index, destination[i], 1);
                byteRef.add(2);
            }
        }
        function setInt16Array(view, destination, byteRef) {
            for (var i = 0; i < destination.length; i++) {
                view.setInt16(byteRef.index, destination[i], 1);
                byteRef.add(2);
            }
        }

        return {
            ByteReference: byteRef,
            parseFloat32Array: parseFloat32Array,
            parseInt16Array: parseInt16Array,
            parseInt8Array: parseInt8Array,
            parseUint8Array: parseUint8Array,
            parseUint16Array: parseUint16Array,
            setFloat32Array: setFloat32Array,
            setInt8Array: setInt8Array,
            setUint8Array: setUint8Array,
            setUint16Array: setUint16Array,
            setInt16Array: setInt16Array,
        };
    };

    angular.module('flybrixApp').factory('serializer', serializer);

}());
