(function() {
    'use strict';

    function Reader(capacity) {
        this.N = capacity || 2000;
        this.buffer = new Uint8Array(capacity);
        this.ready_for_new_message = true;
        this.buffer_length = 0;
    }

    Reader.prototype.__cobsDecode = function() {
        var src_ptr = 0;
        var dst_ptr = 0;
        var leftover_length = 0;
        var append_zero = false;
        while (this.buffer[src_ptr]) {
            if (!leftover_length) {
                if (append_zero)
                    this.buffer[dst_ptr++] = 0;
                leftover_length = this.buffer[src_ptr++] - 1;
                append_zero = leftover_length < 0xFE;
            } else {
                --leftover_length;
                this.buffer[dst_ptr++] = this.buffer[src_ptr++];
            }
        }

        return leftover_length ? 0 : dst_ptr;
    };

    Reader.prototype.AppendToBuffer = function(data, callback) {
        for (var i = 0; i < data.length; i++) {
            var c = data[i];
            if (this.ready_for_new_message) {
                // first byte of a new message
                this.ready_for_new_message = false;
                this.buffer_length = 0;
            }

            this.buffer[this.buffer_length++] = c;

            if (c && this.buffer_length == this.N) {
                // buffer overflow, probably due to errors in data
                console.log("ERROR: buffer overflow in serial_backend.js");
                this.ready_for_new_message = true;
                continue;
            }

            if (!c) {
                this.buffer_length = this.__cobsDecode();
                if (this.buffer_length === 0) {
                    this.buffer[0] = 1;
                }
                for (var j = 1; j < this.buffer_length; ++j) {
                    this.buffer[0] ^= this.buffer[j];
                }
                if (this.buffer[0] === 0) {  // check sum is correct
                    this.ready_for_new_message = true;
                    if (this.buffer_length > 8) {
                        var command = this.buffer[1];
                        var mask = 0;
                        for (var k = 0; k < 4; ++k) {
                            mask |= this.buffer[k + 2] << (k * 8);
                        }
                        callback(command, mask, this.buffer.subarray(6, this.buffer_length).slice().buffer);
                    }
                } else {  // bad checksum
                    this.ready_for_new_message = true;
                    var bytes = "";
                    var message = "";
                    for (var j = 0; j < this.buffer_length; j++) {
                        bytes += this.buffer[j] + ",";
                        message += String.fromCharCode(this.buffer[j]);
                    }
                    console.log("BAD PACKET (" + this.buffer_length + " bytes)", bytes, message);
                }
            }
        }
    };

    function encode(buf) {
        var retval = new Uint8Array((buf.byteLength * 255 + 761) / 254);
        var len = 1;
        var pos_ctr = 0;
        for (var i = 0; i < buf.length; ++i) {
            if (retval[pos_ctr] == 0xFE) {
                retval[pos_ctr] = 0xFF;
                pos_ctr = len++;
                retval[pos_ctr] = 0;
            }
            var val = buf[i];
            ++retval[pos_ctr];
            if (val) {
                retval[len++] = val;
            } else {
                pos_ctr = len++;
                retval[pos_ctr] = 0;
            }
        }
        return retval.subarray(0, len).slice().buffer;
    };

    angular.module('flybrixApp').factory('cobs', function() {
        return {
            Reader: Reader,
            encode: encode,
        };
    });

}());
