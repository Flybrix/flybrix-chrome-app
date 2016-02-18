
(function ($) {

	$.fn.write_to_filehandler = function (data, bypass_delay) {
		this.each(function () {

			var filehandler_query = $(this);

			chosenEntry = filehandler_query.data("chosenEntry");
			data = new Blob([filehandler_query.data("recordings"), data]);
			filehandler_query.data("recordings", data);

			if (!chosenEntry) {
				console.error('no file selected');
				return;
			}
			if (bypass_delay || (new Date() - filehandler_query.data("lasttick") < 5000))
				return;
			filehandler_query.data("lasttick", new Date());
			var dataReader = new window.FileReader();
			dataReader.onloadend = function() {
					chosenEntry.createWriter(//use this filewriter to write data
						function (fileWriter) {
							fileWriter.onerror = function (e) {
								console.log('data write failed: ' + e.toString());
							};

							//write data
							// data is decoded via new Uint8Array(atob(data).split("").map(function(c) {return c.charCodeAt(0); }));
							fileWriter.write(new Blob([JSON.stringify({
								version: eepromConfig.version,
								config: eepromConfig,
								data: btoa(String.fromCharCode.apply(null, new Uint8Array(dataReader.result)))
							})]));
						},
						function (e) {
							console.error(e);
					});
			};
			dataReader.readAsArrayBuffer(data);
		});
	};

	$.fn.create_filehandler = function () {
		this.each(function () {

			$(this).addClass("flybrix-filehandler");

			$(this).data("chosenEntry", null);

			var filehandler_query = $(this);

			//active checkbox clicks should be handled by the parent js
			$("<input type='checkbox' id='active' value='value' class='checkbox'/>")
			.appendTo(filehandler_query);

			var file_textbox_selector = '#' + filehandler_query.attr('id') + ' #file';
			$("<div class='filename' id='file'/>")
			.appendTo(filehandler_query);

			$("<img class='button' src='/img/save.png'/>")
			.appendTo(filehandler_query)
			.click(function (event) {
				event.preventDefault();
				var accepts = [{
						mimeTypes : ['text/*'],
						extensions : ['dat', 'csv', 'txt', 'bin', 'log', 'raw']
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
					filehandler_query.data("recordings", new Blob());
					filehandler_query.data("lasttick", new Date());

					chrome.fileSystem.getDisplayPath(theEntry, function (displayPath) {
						$(file_textbox_selector).html(displayPath);
					});
				});
			});

		});
	};

    $.fn.write_eeprom_to_filehandler = function (data) {
		this.each(function () {
			var filehandler_query = $(this);

			chosenEntry = filehandler_query.data("chosenEntry");

            if (!chosenEntry) {
                command_log('No eeprom file selected!');
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
                            console.log('data write failed: ' + e.toString());
                            console.error(e);
                        };
                        fileWriter.onwriteend = function (e) {
                            command_log('Write -- <span style="color: green">SUCCESSFUL</span>');
                            console.log('Write SUCCESSFUL');
                        };
                        //write data
                        var dataBlob = new Blob([JSON.stringify(data)], {type: 'text/plain'});
                        fileWriter.seek(-1);
                        fileWriter.write(dataBlob);
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

   $.fn.read_eeprom_from_filehandler = function (data) {
		this.each(function () {
			var filehandler_query = $(this);

			chosenEntry = filehandler_query.data("chosenEntry");

            if (!chosenEntry) {
                command_log('No eeprom file selected!');
				console.error('no file selected');
				return;
			}

            // read contents into variable
            chosenFileEntry.file(function(file) {
                var reader = new FileReader();

                reader.onerror = function (e) {
                    console.error(e);
                };

                reader.onloadend = function(e) {
                    command_log('Read <span style="color: green;">SUCCESSFUL</span>');
                    console.log('Read SUCCESSFUL');

                    try { // check if string provided is a valid JSON
                        var deserialized_config_object = JSON.parse(e.target.result);

                        if (deserialized_config_object.version === undefined)
                            throw 'no version parameter found';
                    } catch (e) {
                        // data provided != valid json object
                        command_log('Data provided doesn\'t contain valid JSON string -- <span style="color: red;">ABORTING</span>');
                        console.log('Data provided != valid JSON string');
                        return;
                    }

                    // replacing "old configuration" with configuration from backup file
                    if (eepromConfig.version == deserialized_config_object.version) {
                        command_log('EEPROM version number/pattern -- <span style="color: green;">MATCH</span>');
                        console.log('EEPROM version number/pattern matches backup EEEPROM file version/pattern');
                    } else {
                        command_log('EEPROM version number/pattern -- <span style="color: red;">MISSMATCH</span> (manual values re-validation is advised)');
                        console.log('EEPROM version number/pattern doesn\'t match backup EEPROM file version/pattern (manual values re-validation is advised)');
                    }

                    eepromConfig = deserialized_config_object;

                    // Send updated CONFIG to the flight controller
                    sendCONFIG();

                };

                reader.readAsText(file);
            });
        });
    };
}
	(jQuery));
