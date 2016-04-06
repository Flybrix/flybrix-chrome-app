function initialize_sensors_view() {
    eeprom_refresh_callback_list.add(refresh_sensors_view_from_eepromConfig);
    refresh_sensors_view_from_eepromConfig();
};

function refresh_sensors_view_from_eepromConfig() {
    //nothing yet
};
