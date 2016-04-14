
// order of channels in assignedChannel array is ['THROTTLE','PITCH','ROLL','YAW/RUDDER','AUX 1','AUX 2']

function initialize_signals_view() {
    $('#commands-master-plot').create_plot(["Fz (m)", "Tx (deg)", "Ty (deg)", "Tz (deg)"]);
    $('#commands-slave-plot').create_plot(["Fz (m/s)", "Tx (deg/s)", "Ty (deg/s)", "Tz (deg/s)"]);
    $('#commands-direct-plot').create_plot(["Fz (pwm counts)", "Tx (pwm counts)", "Ty (pwm counts)", "Tz (pwm counts)"]);

    $('#signals .command-settings-channelMidpoint-field').connect_to_eeprom();
    $('#signals .command-settings-channelDeadzone-field').connect_to_eeprom();
    $('#signals .command-settings-assignedChannel-field').connect_to_eeprom();
    $('#signals .command-settings-commandScaling-field').connect_to_eeprom();
    $('#signals .command-settings-checkbox-inversion').connect_to_eeprom();
    eeprom_refresh_callback_list.add(refresh_signals_view_from_eepromConfig);

    refresh_signals_view_from_eepromConfig();
};

function refresh_signals_view_from_eepromConfig() {
    loadArrayValues($('#signals .command-settings-assignedChannel-field'), eepromConfig.assignedChannel, 0);

    $("#signals .command-settings-checkbox-inversion.0").prop("checked", ((eepromConfig.commandInversion >> 0) & 1));
    $("#signals .command-settings-checkbox-inversion.1").prop("checked", ((eepromConfig.commandInversion >> 1) & 1));
    $("#signals .command-settings-checkbox-inversion.2").prop("checked", ((eepromConfig.commandInversion >> 2) & 1));

    $("#signals .command-settings-commandScaling-field.thrustMasterPIDParameters ").val(eepromConfig.thrustMasterPIDParameters[6].toFixed(4));
    $("#signals .command-settings-commandScaling-field.pitchMasterPIDParameters ").val(eepromConfig.pitchMasterPIDParameters[6].toFixed(4));
    $("#signals .command-settings-commandScaling-field.rollMasterPIDParameters ").val(eepromConfig.rollMasterPIDParameters[6].toFixed(4));
    $("#signals .command-settings-commandScaling-field.yawMasterPIDParameters ").val(eepromConfig.yawMasterPIDParameters[6].toFixed(4));
    $("#signals .command-settings-commandScaling-field.thrustSlavePIDParameters ").val(eepromConfig.thrustSlavePIDParameters[6].toFixed(4));
    $("#signals .command-settings-commandScaling-field.pitchSlavePIDParameters ").val(eepromConfig.pitchSlavePIDParameters[6].toFixed(4));
    $("#signals .command-settings-commandScaling-field.rollSlavePIDParameters ").val(eepromConfig.rollSlavePIDParameters[6].toFixed(4));
    $("#signals .command-settings-commandScaling-field.yawSlavePIDParameters ").val(eepromConfig.yawSlavePIDParameters[6].toFixed(4));

    $("#signals .command-settings-channelMidpoint-field.0 ").val(eepromConfig.channelMidpoint[0].toFixed(0));
    $("#signals .command-settings-channelMidpoint-field.1 ").val(eepromConfig.channelMidpoint[1].toFixed(0));
    $("#signals .command-settings-channelMidpoint-field.2 ").val(eepromConfig.channelMidpoint[2].toFixed(0));
    $("#signals .command-settings-channelMidpoint-field.3 ").val(eepromConfig.channelMidpoint[3].toFixed(0));
    $("#signals .command-settings-channelMidpoint-field.4 ").val(eepromConfig.channelMidpoint[4].toFixed(0));
    $("#signals .command-settings-channelMidpoint-field.5 ").val(eepromConfig.channelMidpoint[5].toFixed(0));

    $("#signals .command-settings-channelDeadzone-field.0 ").val(eepromConfig.channelDeadzone[0].toFixed(0));
    $("#signals .command-settings-channelDeadzone-field.1 ").val(eepromConfig.channelDeadzone[1].toFixed(0));
    $("#signals .command-settings-channelDeadzone-field.2 ").val(eepromConfig.channelDeadzone[2].toFixed(0));
    $("#signals .command-settings-channelDeadzone-field.3 ").val(eepromConfig.channelDeadzone[3].toFixed(0));
    $("#signals .command-settings-channelDeadzone-field.4 ").val(eepromConfig.channelDeadzone[4].toFixed(0));
    $("#signals .command-settings-channelDeadzone-field.5 ").val(eepromConfig.channelDeadzone[5].toFixed(0));
}

(function() {
    'use strict';

    var signalsController = function($scope, $rootScope) {
        $rootScope.$watch('state', function(st) {
            if (!st)
                return;

            var eC = $rootScope.eepromConfig;
            if (!eC)
                return;

            // update AUX mask led indicators
            $scope.auxBits = [];
            for (var mask = 0; mask < 6; ++mask)
                $scope.auxBits.push(!(st.AUX_chan_mask & (1 << mask)));

            var RC_min = 1100;
            var RC_max = 1900;
            var RC_mid = 1500;


            var throttle_threshold = ((RC_max - RC_min) / 10) + RC_min;
            var Fz_cmd = Math.min(Math.max(parseInt((st.ppm[eC.assignedChannel[0]] - throttle_threshold) * 4095 / (RC_max - throttle_threshold)), 0), 4095);
            var Tx_cmd = Math.min(
                Math.max(parseInt((1 - 2 * ((eC.commandInversion >> 0) & 1)) * (st.ppm[eC.assignedChannel[1]] - eC.channelMidpoint[eC.assignedChannel[1]]) * 4095 / (RC_max - RC_min)), -2047), 2047);
            var Ty_cmd = Math.min(
                Math.max(parseInt((1 - 2 * ((eC.commandInversion >> 1) & 1)) * (st.ppm[eC.assignedChannel[2]] - eC.channelMidpoint[eC.assignedChannel[2]]) * 4095 / (RC_max - RC_min)), -2047), 2047);
            var Tz_cmd = Math.min(
                Math.max(parseInt((1 - 2 * ((eC.commandInversion >> 2) & 1)) * (st.ppm[eC.assignedChannel[3]] - eC.channelMidpoint[eC.assignedChannel[3]]) * 4095 / (RC_max - RC_min)), -2047), 2047);

            // dead zone
            var RC_dead_zone_half_width = 30;
            Tx_cmd =
                (Tx_cmd > 0) ? Math.max(0, Tx_cmd - (2047.0 / 400.0) * eC.channelDeadzone[eC.assignedChannel[1]]) : Math.min(Tx_cmd + (2047.0 / 400.0) * eC.channelDeadzone[eC.assignedChannel[1]], 0);
            Ty_cmd =
                (Ty_cmd > 0) ? Math.max(0, Ty_cmd - (2047.0 / 400.0) * eC.channelDeadzone[eC.assignedChannel[2]]) : Math.min(Ty_cmd + (2047.0 / 400.0) * eC.channelDeadzone[eC.assignedChannel[2]], 0);
            Tz_cmd =
                (Tz_cmd > 0) ? Math.max(0, Tz_cmd - (2047.0 / 400.0) * eC.channelDeadzone[eC.assignedChannel[3]]) : Math.min(Tz_cmd + (2047.0 / 400.0) * eC.channelDeadzone[eC.assignedChannel[3]], 0);

            var scaleFz = eC.thrustMasterPIDParameters[6] / 4095;
            var scaleTx = eC.pitchMasterPIDParameters[6] / 2047;
            var scaleTy = eC.rollMasterPIDParameters[6] / 2047;
            var scaleTz = eC.yawMasterPIDParameters[6] / 2047;

            $scope.masterSetpoints = [scaleFz * Fz_cmd, scaleTx * Tx_cmd, scaleTy * Ty_cmd, scaleTz * Tz_cmd];

            scaleFz = eC.thrustSlavePIDParameters[6] / 4095;
            scaleTx = eC.pitchSlavePIDParameters[6] / 2047;
            scaleTy = eC.rollSlavePIDParameters[6] / 2047;
            scaleTz = eC.yawSlavePIDParameters[6] / 2047;

            $scope.slaveSetpoints = [scaleFz * Fz_cmd, scaleTx * Tx_cmd, scaleTy * Ty_cmd, scaleTz * Tz_cmd];

            $scope.outputLevels = [Fz_cmd, Tx_cmd, Ty_cmd, Tz_cmd];
        });
    };

    angular.module('flybrixApp').controller('signalsController', ['$scope', '$rootScope', signalsController]);

}());
