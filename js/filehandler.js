
(function ($) {

	// A map of all migration functions that update configuration data
	var migrations = {
		'0.8': function (config) {
			config.version = config.config.version = [0, 9, 0];
			console.log("Went from 0.8 to 0.9");
			console.log("The migration system works!");
		},
		'0.9': function (config) {
			config.version = config.config.version = [1, 0, 0];
			console.log("Went from 0.9 to 1.0");
			console.log("The migration system works!");
		},
		'1.0': function (config) {
			// no changes to the actual config structure, but some PID parameters were changed
			config.version = config.config.version = [1, 1, 0];
			console.log("Went from 1.0 to 1.1");
		}
	};

	function migrate(config, recursive_call) {
		recursive_call = recursive_call || false;
		var desiredVersion = eepromConfig.version.slice(0, 2).join('.');
		var currentVersion = config.version.slice(0, 2).join('.');

		if (desiredVersion === currentVersion) { //http://semver.org/
			if (recursive_call)
				command_log('Configuration update <span style="color: green;">SUCCESSFUL</span>');
			return true;
		}
		if (!recursive_call)
			command_log('EEPROM version is newer than the configuration file - attempting update');
		if (currentVersion in migrations) {
			migrations[currentVersion](config);
			return migrate(config, true);
		}
		return false;
	}

	$.fn.write_datastream_to_filehandler = function (data, force_write) {
		this.each(function () {

			var filehandler_query = $(this);

			chosenEntry = filehandler_query.data("chosenEntry");

			data = new Blob([filehandler_query.data("blobData"), data]);
			filehandler_query.data("blobData", data);

			if (!chosenEntry) {
				console.error('no file selected');
				return;
			}
			if (force_write || (new Date() - filehandler_query.data("lastBlobWrite") > 5000)) {

				filehandler_query.data("lastBlobWrite", new Date());

				var dataReader = new window.FileReader();
				dataReader.onloadend = function (e) {

					chosenEntry.createWriter(//use this filewriter to write data
						function (fileWriter) {
						fileWriter.onerror = function (e) {
							console.log('data write failed: ' + e.toString());
						};

						//write data
						// data packets are decoded via new Uint8Array(atob(data).split("").map(function(c) {return c.charCodeAt(0); }));
						fileWriter.write(new Blob([JSON.stringify({
										version : eepromConfig.version,
										config : eepromConfig,
										data : btoa(String.fromCharCode.apply(null, new Uint8Array(e.target.result)))
									})]));
					},
						function (e) {
						console.error(e);
					});
				};
				dataReader.readAsArrayBuffer(data);
			};
		});
	};

	$.fn.create_filehandler = function (button1_label, button2_label) {
		this.each(function () {

			$(this).addClass("flybrix-filehandler");

			$(this).data("chosenEntry", null);

			var filehandler_query = $(this);

			//create two buttons using passed in labels
			//button actions are handled by parent js

			$("<div class='button text-button filehandler-button1' id='button1'>" + button1_label + "</div>")
			.appendTo(filehandler_query)
			.click(function (event) {
				event.preventDefault();
				console.log("filehandler button1 click needs override");
			});

			$("<div class='button text-button filehandler-button2' id='button2'>" + button2_label + "</div>")
			.appendTo(filehandler_query)
			.click(function (event) {
				event.preventDefault();
				console.log("filehandler button2 click needs override");
			});

			var file_textbox_selector = '#' + filehandler_query.attr('id') + ' #file';
			$("<div class='filename' id='file'/>")
			.appendTo(filehandler_query);

			$("<img class='icon-button' src='/img/open.png'/>")
			.appendTo(filehandler_query)
			.click(function (event) {
				event.preventDefault();
				var accepts = [{
						mimeTypes : ['text/*'],
						extensions : ['dat', 'csv', 'txt', 'bin', 'log', 'raw', 'json']
					}
				];
				chrome.fileSystem.chooseEntry({
					type : 'saveFile',
					accepts : accepts
				}, function (theEntry) {
					if (!theEntry) {
						$(file_textbox_selector).html('No File Selected!');
						return;
					}
					filehandler_query.data("chosenEntry", theEntry);
					filehandler_query.data("blobData", new Blob());
					filehandler_query.data("lastBlobWrite", new Date());

					chrome.fileSystem.getDisplayPath(theEntry, function (displayPath) {
						$(file_textbox_selector).html(displayPath);
					});
				});
			});

		});
	};

	$.fn.write_eepromConfig_to_filehandler = function () {
		this.each(function () {
			var filehandler_query = $(this);

			chosenEntry = filehandler_query.data("chosenEntry");

            if (!chosenEntry) {
                command_log('No file selected for saving configuration!');
				console.error('no file selected');
				return;
			}

			chosenEntry.createWriter(//use this filewriter to erase file
				function (fileTruncator) {
				overwrite_file = 0;
				fileTruncator.truncate(0);
				fileTruncator.onerror = function (e) {
					console.log('Truncate failed: ' + e.toString());
				};
				fileTruncator.onwriteend = function (e) {
					//console.log('Truncate complete');
					chosenEntry.createWriter(//use this filewriter to write data
						function (fileWriter) {
						fileWriter.onerror = function (e) {
                            command_log('Writing configuration <span style="color: red">FAILED</span>');
							console.log('data write failed: ' + e.toString());
							console.error(e);
						};
						fileWriter.onwriteend = function (e) {
							command_log('Writing configuration was <span style="color: green">SUCCESSFUL</span>');
							console.log('Write SUCCESSFUL');
						};
						//write data
						fileWriter.seek(-1);
						fileWriter.write(new Blob([JSON.stringify({
										version : eepromConfig.version,
										config : eepromConfig
                                        })]));
					},
						function (e) {
						console.error(e);
					});
				};
			},
				function (e) {
				console.error(e);
			});

		});
	};

	$.fn.read_eepromConfig_from_filehandler = function () {
		this.each(function () {
			var filehandler_query = $(this);

			chosenEntry = filehandler_query.data("chosenEntry");

			if (!chosenEntry) {
				command_log('No file selected for loading configuration!');
				console.error('no file selected');
				return;
			}

			chosenEntry.file(function (file) {
				var reader = new FileReader();

				reader.onerror = function (e) {
                    command_log('Reading configuration <span style="color: red">FAILED</span>');
					console.error(e);
				};

				reader.onloadend = function (e) {
					command_log('Reading configuration was <span style="color: green;">SUCCESSFUL</span>');

					try { // check if string provided is a valid JSON
						var deserialized_config_object = JSON.parse(e.target.result);
						if (deserialized_config_object.version === undefined)
							throw 'no version parameter found';
					} catch (e) {
                        command_log('Reading configuration <span style="color: red">FAILED</span>');
						command_log('File provided doesn\'t contain valid data');
						return;
					}

                    console.log('here!');
					// replace eepromConfig with configuration from backup file
					if (migrate(deserialized_config_object)){ //http://semver.org/

						command_log('Configuration MAJOR and MINOR versions <span style="color: green;">MATCH</span>');
						console.log('versions match');

                        eepromConfig = deserialized_config_object.config;
                        sendCONFIG();

					} else {
						command_log('Configuration MAJOR and MINOR versions <span style="color: red;">DO NOT MATCH</span>');
                        command_log('Reading configuration <span style="color: red">FAILED</span>');
						console.log('version mismatch');
					}
				};

				reader.readAsText(file);
			});
		});
	};
}
	(jQuery));
