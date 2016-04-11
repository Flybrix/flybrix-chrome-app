
function initialize_motors_view() {
	$('#motor-view-override-pilot').click(function() {
        var style_str = $('#motor-view-motors-override').attr('style');
        if (style_str && ($.inArray('background-color', style_str.split(':')) >= 0)) {
            setTimeout(function() {	send_message(CommandFields.COM_SET_COMMAND_OVERRIDE, 1); },1);
        }
        else{
            setTimeout(function() {	send_message(CommandFields.COM_SET_COMMAND_OVERRIDE, 0); }, 1);
        }
    });

	$('#motor-view-enable-motors').click(function() {

        var style_str = $('#motor-view-motors-enabled').attr('style');
        if (style_str && ($.inArray('background-color', style_str.split(':')) >= 0)) {
            console.log('enabling motors');
            var i;
            for (i = 0; i < 81; i++) {
                setTimeout(function() {	send_message(CommandFields.COM_REQ_ENABLE_ITERATION, 1, false); }, i*10);
            }
            setTimeout(function() {	send_message(CommandFields.COM_REQ_ENABLE_ITERATION, 1); }, i);
        }
        else{
            console.log('disabling motors');
            setTimeout(function() {	send_message(CommandFields.COM_REQ_ENABLE_ITERATION, 0); }, 1);
        }
    });

    $('#motor-view-zero-motors').click(function() {
        console.log('zero');
        setTimeout(function(){send_message(CommandFields.COM_MOTOR_OVERRIDE_SPEED_ALL, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); }, 1);
    });

    $('#motors .motor-view-level-value').change(function(e){
        var motor_n = parseInt($(this).parent().index()); // motor number
        console.log(motor_n);
        var motor_v = parseInt($(this).val()); // motor value
        setTimeout(function(){send_message(CommandFields.COM_MOTOR_OVERRIDE_SPEED_0 << motor_n, [motor_v % 256, motor_v / 256]); }, 1);
    }).attr('step', 'any').attr('type', 'number').attr('min', 0);

    $('#motors .mixtable-entry-field.mixTableFz').connect_to_eeprom();
    $('#motors .mixtable-entry-field.mixTableTx').connect_to_eeprom();
    $('#motors .mixtable-entry-field.mixTableTy').connect_to_eeprom();
    $('#motors .mixtable-entry-field.mixTableTz').connect_to_eeprom();
    eeprom_refresh_callback_list.add(refresh_motors_view_from_eepromConfig);

	refresh_motors_view_from_eepromConfig();

    $('#motors .motor-view-level-value').blur();
};


function refresh_motors_view_from_eepromConfig() {
    loadArrayValues($('#motors .mixtable-entry-field.mixTableFz'), eepromConfig.mixTableFz, 0);
    loadArrayValues($('#motors .mixtable-entry-field.mixTableTx'), eepromConfig.mixTableTx, 0);
    loadArrayValues($('#motors .mixtable-entry-field.mixTableTy'), eepromConfig.mixTableTy, 0);
    loadArrayValues($('#motors .mixtable-entry-field.mixTableTz'), eepromConfig.mixTableTz, 0);

}

function update_bar_css(index, type, val){
    // if newval = +4096 --> top is 0, height is 128
    // if newval = -2047 --> top is 128, height is 64
    var top_px    = 128;
    var height_px = 1;
    if (val > 4) {
        height_px = val * 128/4096;
        top_px = 128 - height_px;
    }
    if (val < -4) {
        height_px = val * -128/4096;
        top_px = 128;
    }
    $('.'+ index +' .motor-view-level-bar-' + type).css({'top' : top_px+'px','height' : height_px+'px'});
}

(function() {
  'use strict';

  var motorsController = function ($scope, $rootScope) {
      var last_motors_view_update = new Date();
      $scope.$watch('state', function () {
          if (!$rootScope.state)
              return;

          $scope.motorsEnabledNeg = !($rootScope.state.status & 0x0400);
          $scope.motorsOverrideNeg = !($rootScope.state.status & 0x8000);

          var now = new Date();
          if (now - last_motors_view_update > graph_update_delay) { //throttle redraw to 20Hz
              for (var i = 0; i < 8; i++) {
                  update_bar_css(i, 'Fz', $rootScope.state.control[0] * eepromConfig.mixTableFz[i] / Math.max.apply(null, eepromConfig.mixTableFz));
                  update_bar_css(i, 'Tx', $rootScope.state.control[1] * eepromConfig.mixTableTx[i] / Math.max.apply(null, eepromConfig.mixTableTx));
                  update_bar_css(i, 'Ty', $rootScope.state.control[2] * eepromConfig.mixTableTy[i] / Math.max.apply(null, eepromConfig.mixTableTy));
                  update_bar_css(i, 'Tz', $rootScope.state.control[3] * eepromConfig.mixTableTz[i] / Math.max.apply(null, eepromConfig.mixTableTz));
                  update_bar_css(i, 'sum', $rootScope.state.MotorOut[i]);
                  if (!$('.'+ i +' .motor-view-level-value').is(":focus"))
                      $('.'+ i +' .motor-view-level-value').val($rootScope.state.MotorOut[i].toFixed(0));
              }
              last_motors_view_update = now;
          }

      });

      $scope.motorsEnabledNeg = true;
      $scope.motorsOverrideNeg = true;
  };

  angular.module('flybrixApp').controller('motorsController', ['$scope', '$rootScope', motorsController]);
}());
