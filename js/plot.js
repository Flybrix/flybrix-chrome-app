
(function ($) {

	function togglePlotSeries(plotname, series_index) {
		var plot = $("." + plotname).data("plot");
		var plot_series = plot.getData();
		plot_series[series_index].lines.show = !plot_series[series_index].lines.show;
	}

	$.fn.create_histogram = function (series_data) {
		this.each(function () {
			console.log("create histogram", this, series_data);
			var plot_options = {
				legend : {
					show : true,
					position : "nw",
					margin : [10, 10]
				},
				xaxis : {
					zoomRange : [-1000, 1000],
					panRange : [-5, 4300]//default to uint32_t micros time range in seconds
				},
				yaxis : {
					zoomRange : [-1000, 1000],
					panRange : [-10, 1000]
				},
				zoom : {
					interactive : true
				},
				pan : {
					interactive : true
				}
			};
			$(this).addClass("flybrix-histogram");
			var plot = $.plot(this, series_data, plot_options);
		});
	};

	$.fn.create_plot = function (labels) {
		this.each(function () {

			var plot_query = $(this);
			$(this).addClass("flybrix-plot");

			var colors = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#fbd850", "#a65628", "#f781bf"]

			var plot_series = [];
			for (var i = 0; i < labels.length; i++) {
				plot_series.push({
					color : colors[i],
					data : [],
					label : labels[i],
					lines : {
						show : true
					},
					bars : {},
					points : {},
					clickable : false,
					hoverable : false,
					shadowSize : 0,
					lastUpdate : 0

				});
			}

			var plot_options = {
				legend : {
					show : true,
					position : "nw",
					margin : [10, 10],
				},
				xaxis : {
					zoomRange : [-1000, 1000],
					panRange : [-5, 4300]//default to uint32_t micros time range in seconds
				},
				yaxis : {
					zoomRange : [-1000, 1000],
					panRange : [-10, 1000]
				},
				zoom : {
					interactive : true
				},
				pan : {
					interactive : true
				}
			}

			var plot = $.plot(this, plot_series, plot_options);

			// add buttons
			$("<img class='button' id='clear' src='/img/clear.png' style='right:-115px;top:138px;width:24px'/>")
			.appendTo(plot_query)
			.click(function (event) {
				event.preventDefault();
				var data = plot.getData();
				data.forEach(function (v) {
					v.data = new Array();
				});
				plot.setData(data);
				plot_query.update_flybrix_plot_series();
			});

			$("<img class='button' id='zoomout' src='/img/zoomout.png' style='right:-25px;top:138px;width:24px'/>")
			.appendTo(plot_query)
			.click(function (event) {
				event.preventDefault();
				plot.zoomOut();
			});

			$("<img class='button' id='histogram' src='/img/histogram.png' style='right:-55px;top:140px;width:20px'/>")
			.appendTo(plot_query)
			.click(function (event) {
				event.preventDefault();
				var histogram_id = Date.now(); //use the creation time to keep track of the associated dialog

				$("<div id='" + histogram_id + "' class='histogram-dialog-content' title='Histogram'><div class='flybrix-plot-holder'></div></div>")
				.appendTo(plot_query).dialog({
					close : function (event, ui) {
						$('#' + histogram_id + '.histogram-dialog-content').parent().remove();
						$('#' + histogram_id + '.histogram-dialog-content').remove();
					}
				});
				$('#' + histogram_id + '.histogram-dialog-content').parent().addClass("histogram-dialog");
				//jquery ui starts out with the close button focused...
				$('.ui-dialog :button').blur();

				//extract the active series data for our histogram
				var parent_plot = $(plot_query).data("plot");
				var plot_series = parent_plot.getData();
				var histogram_series = [];
				for (var i = 0; i < plot_series.length; i++) {
					if (plot_series[i].lines.show) {
						histogram_series.push({});
						histogram_series[histogram_series.length - 1] = $.extend(true, histogram_series[histogram_series.length - 1], plot_series[i]); // copy everything
						var y = [];
						for (var j = 0; j < plot_series[i].data.length; j++) {
							y.push(plot_series[i].data[j][1]);
						}
						var y_bin_count = 1 + Math.log2(y.length);
						var y_min = Math.min.apply(null, y);
						var y_max = Math.max.apply(null, y);
						var y_bin_width = (y_max - y_min) / y_bin_count;
						if (y_bin_width == 0) {
							y_bin_count = 1;
						}
						var bin_centers = [];
						var bin_counts = [];
						for (var j = 0; j < y_bin_count; j++) {
							bin_centers.push(y_min + (j - 0.5) * y_bin_width);
							bin_counts.push(0);
						}
						bin_centers = bin_centers.sort(function (a, b) {
								return a - b
							});
						y = y.sort(function (a, b) {
								return a - b
							});

						var k = 0;
						for (var j = 0; j < y.length; j++) {
							if (k < bin_centers.length - 1) {
								var next_bin_min = bin_centers[k + 1] - y_bin_width / 2.0;
								if (y[j] > next_bin_min) {
									k += 1;
								}
							}
							bin_counts[k] += 1;
						}
						//overwrite series data
						histogram_series[histogram_series.length - 1].data = [];
						for (var j = 0; j < bin_centers.length; j++) {
							histogram_series[histogram_series.length - 1].data.push([bin_centers[j], bin_counts[j]]);
						}
					}
				}

				$('#' + histogram_id + '.histogram-dialog-content .flybrix-plot-holder').create_histogram(histogram_series);
			});

			$("<img class='button' id='save' src='/img/save.png' style='right:-85px;top:140px;width:20px'/>")
			.appendTo(plot_query)
			.click(function (event) {
				event.preventDefault();
				var parent_plot = $(plot_query).data("plot");
				var plot_series = parent_plot.getData();
				var csv_str = "timestamp,";
				// header row
				for (var i = 0; i < plot_series.length; i++) {
					csv_str += (plot_series[i].label).split('=')[0] + ",";
				}
				csv_str = csv_str.slice(0, -1) + '\n';
				// data rows
				for (var j = 0; j < plot_series[0].data.length; j++) {
					csv_str += plot_series[0].data[j][0] + ",";
					for (var i = 0; i < plot_series.length; i++) {
						csv_str += plot_series[i].data[j][1] + ",";
					}
					csv_str = csv_str.slice(0, -1) + '\n';
				}

				chrome.fileSystem.chooseEntry({
					type : 'saveFile',
					suggestedName : 'plotdata.csv',
					accepts : [{
							description : 'CSV files (*.csv)',
							extensions : ['csv', 'dat']
						}
					],
					acceptsAllTypes : false
				},
					function (theEntry) {

					if (!theEntry) {
						command_log('No File Selected!');
						console.log('no file selected...');
						return;
					}
					theEntry.createWriter(//use this filewriter to erase file
						function (fileTruncator) {
						overwrite_file = 0;
						fileTruncator.truncate(0);
						fileTruncator.onerror = function (e) {
							console.log('Truncate failed: ' + e.toString());
						};
						fileTruncator.onwriteend = function (e) {
							theEntry.createWriter(//use this filewriter to write data
								function (fileWriter) {
								fileWriter.onerror = function (e) {
									console.log('data write failed: ' + e.toString());
									console.error(e);
								};
								fileWriter.onwriteend = function (e) {
									command_log('Write plot to CSV -- <span style="color: green">SUCCESSFUL</span>');
									console.log('Write SUCCESSFUL');
								};
								//write data
								var dataBlob = new Blob([csv_str], {
										type : 'text/plain'
									});
								fileWriter.seek(-1);
								fileWriter.write(dataBlob);
							},
								function (e) {
								console.error(e);
							}); //Writer
						};
					},
						function (e) {
						console.error(e);
					}); //Truncator
				} //callback using theEntry
				); //file chooser
			}); //click event

			// done with save button; back to setting up the parent plot

			// and add panning buttons
			// little helper for taking the repetitive work out of placing panning arrows

			var panArrowRight = -90;
			var panArrowTop = 90;

			function addPanArrow(dir, right, top, offset) {
				$("<img class='button' src='/img/arrow-" + dir + ".gif' style='right:" + (right + panArrowRight) + "px;top:" + (top + panArrowTop) + "px'/>")
				.appendTo(plot_query)
				.click(function (e) {
					e.preventDefault();
					plot.pan(offset);
				});
			}
			addPanArrow("left", 55, 0, {
				left : -100
			});
			addPanArrow("right", 25, 0, {
				left : 100
			});
			addPanArrow("up", 40, -15, {
				top : -100
			});
			addPanArrow("down", 40, 15, {
				top : 100
			});

			function addCheckbox(id, label, right, top, callback) {
				$("<label style='right:" + right + "px;top:" + top + "px'><input type='checkbox' id='" + id + "' value='value' style='right:-20px;top:2px'/>" + label + "</label>")
				.appendTo(plot_query)
				.click(function (e) {
					callback();
				});
			}

			var live_checkbox_selector = '#' + plot_query.attr('id') + ' #live';
			addCheckbox("live", "live", -70, 10, function () {
				//console.log("live is now: ", $(live_checkbox_selector).prop("checked"));
			});

			var autoscalex_checkbox_selector = '#' + plot_query.attr('id') + ' #autoscalex';
			addCheckbox("autoscalex", "autoscale x", -70, 30, function () {
				//console.log("autoscalex is now: ", $(autoscalex_checkbox_selector).prop("checked"));
			});

			var autoscaley_checkbox_selector = '#' + plot_query.attr('id') + ' #autoscaley';
			addCheckbox("autoscaley", "autoscale y", -70, 50, function () {
				//console.log("autoscaley is now: ", $(autoscaley_checkbox_selector).prop("checked"));
			});

			// add a text message
			plot_query.append("<p class='message'>&nbsp;</p>");

			var message_selector = '#' + plot_query.attr('id') + ' .message';
			// show pan/zoom messages to illustrate events
			plot_query.bind("plotpan", function (event, plot) {
				var axes = plot.getAxes();
				$(message_selector).html("Panning to x: " + axes.xaxis.min.toFixed(2)
					 + " &ndash; " + axes.xaxis.max.toFixed(2)
					 + " and y: " + axes.yaxis.min.toFixed(2)
					 + " &ndash; " + axes.yaxis.max.toFixed(2));
			});

			plot_query.bind("plotzoom", function (event, plot) {
				var axes = plot.getAxes();
				$(message_selector).html("Zooming to x: " + axes.xaxis.min.toFixed(2)
					 + " &ndash; " + axes.xaxis.max.toFixed(2)
					 + " and y: " + axes.yaxis.min.toFixed(2)
					 + " &ndash; " + axes.yaxis.max.toFixed(2));
			});

		});
	};

	$.fn.update_flybrix_plot_series = function (label, x, y, redraw) {

		if (redraw === undefined) {
			redraw = true; // default value
		};

		this.each(function () {
			var plotname = $(this).context.className.split(/[ ]+/)[0];
			var plot = $(this).data("plot");
			var plot_series = plot.getData();
			for (var i = 0; i < plot_series.length; i++) {
				if (label === undefined || label === (plot_series[i].label).split('=')[0]) {
					var series = plot_series[i];
					var autoscale_checkbox_query = $('#' + $(this).attr('id'));

					if (x !== undefined) {
						plot.appendData(i, [x, y], 200);
                        // add the value to the label
                        plot_series[i].label = label + '=' + y.toPrecision(4);
                    }
					var now = Date.now();
					if (redraw && ((now - series.lastUpdate) > 100)) { //throttle redraw to 10Hz
						setTimeout(function () {
							if (autoscale_checkbox_query.find("#autoscalex").prop("checked")) {
								var xopts = plot.getXAxes()[0].options;

								var xmin = Number.POSITIVE_INFINITY,
								xmax = Number.NEGATIVE_INFINITY;

								for (var j = 0; j < plot_series.length; j++) {
									var series_data = plot_series[j].data;
									if (plot_series[j].lines.show) {
										for (var k = 0; k < series_data.length; k++) {
											if (series_data[k][0] < xmin) {
												xmin = series_data[k][0];
											}
											if (series_data[k][0] > xmax) {
												xmax = series_data[k][0];
											}
										}
									}
								}
								var margin_x = 0.0;
								xopts.min = Math.min.apply(null, [xmin, (1 - margin_x) * xmin, (1 + margin_x) * xmin]);
								xopts.max = Math.max.apply(null, [xmax, (1 - margin_x) * xmax, (1 + margin_x) * xmax]);
							}
							if (autoscale_checkbox_query.find("#autoscaley").prop("checked")) {
								var yopts = plot.getYAxes()[0].options;

								var ymin = Number.POSITIVE_INFINITY,
								ymax = Number.NEGATIVE_INFINITY;

								for (var j = 0; j < plot_series.length; j++) {
									var series_data = plot_series[j].data;
									if (plot_series[j].lines.show) {
										for (var k = 0; k < series_data.length; k++) {
											if (series_data[k][1] < ymin) {
												ymin = series_data[k][1];
											}
											if (series_data[k][1] > ymax) {
												ymax = series_data[k][1];
											}
										}
									}
								}
								var margin_y = 0.1;
								yopts.min = Math.min.apply(null, [ymin, (1 - margin_y) * ymin, (1 + margin_y) * ymin]);
								yopts.max = Math.max.apply(null, [ymax, (1 - margin_y) * ymax, (1 + margin_y) * ymax]);
							}

							series.lastUpdate = now;
							plot.setupGrid();

							// reset series on/off toggling after calling setupGrid
							$('.' + plotname + ' .legendColorBox').each(function (index, value) {
								$(this).mousedown(function (event) {
									event.preventDefault();
									setTimeout(function () {
										togglePlotSeries(plotname, index);
									}, 1);
								});
								$(this).css({
									cursor : "pointer"
								})
							});

							plot.draw();
						}, 1); //wrap in a timeout to allow other tasks to take priority
					}
				}
			}
		});
	};

}
	(jQuery));

(function() {
		'use strict';

		angular.module('flybrixApp').directive('plotSeries', function () {
				var link = function (scope, element, attrs) {
						var labels = attrs.labels.split('|');

						element.addClass('flybrix-plot-holder');
						element.append($('<div/>').addClass('flybrix-plot-title').text(attrs.title));
						var plotHolder = $('<div/>');
						element.append(plotHolder);
						plotHolder.create_plot(labels);

						var lastTime = new Date();

						scope.$watch(attrs.value, function(value) {
								if (!plotHolder.find("#live").prop("checked"))
										return;
								var newTime = new Date();
								if (newTime - lastTime < graph_update_delay)  // limit plots to 20Hz
										return;
								lastTime = newTime;
								var x = value.x / 1000000;
								var last_idx = value.y.length - 1;
								value.y.forEach(function (y, idx) {
										plotHolder.update_flybrix_plot_series(labels[idx], x, y, idx === last_idx);
								});
						}, true);
				};

				return {
						link: link
				};
		});
}());
