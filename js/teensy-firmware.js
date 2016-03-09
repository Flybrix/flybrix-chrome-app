
function load_firmware(firmware_hex_string) {
	console.log("loading firmware to the teensy");
	byte_count = 0;
	end_record_seen = 0;
	extended_addr = 0;
	parse_hex(firmware_hex_string);
	teensy_open();
}

function parse_hex(firmware_hex_string) {
	console.log("parse hex str:");
	var lines = firmware_hex_string.split('\n');
	for (var i = 0; i < lines.length; i++) {
		//code here using lines[i] which will give you each line
		if (lines[i].length == 0) {
			break;
		}
		if (parse_hex_line(lines[i]) == 0) {
			console.log("Warning, HEX parse error line %d\n", i);
			console.log(lines[i]);
			return -2;
		}
	}
}

function parse_hex_line(line) {
	var addr;
	var code;
	var num;
	var sum = 0;
	var len = 0;
	var cksum = 0;
	var i = 0;
	var ptr = 0;

	num = 0;
	if (line[0] != ':')
		return 0;
	//if (strlen(line) < 11) return 0;
	if (line.length < 11)
		return 0;

	ptr = 1;
	//if (!sscanf(ptr, "%02x", &len)) return 0;
	len = parseInt(line.substr(ptr, 2), 16);
	console.log(len);

	ptr += 2;

	if (line.length < (11 + (len * 2)))
		return 0;
	//if (!sscanf(ptr, "%04x", &addr)) return 0;
	addr = parseInt(line.substr(ptr, 4), 16);

	ptr += 4;
	/* printf("Line: length=%d Addr=%d\n", len, addr); */
	//if (!sscanf(ptr, "%02x", &code)) return 0;
	code = parseInt(line.substr(ptr, 2), 16);

	if (addr + extended_addr + len >= MAX_MEMORY_SIZE)
		return 0;
	ptr += 2;
	sum = (len & 255) + ((addr >> 8) & 255) + (addr & 255) + (code & 255);
	if (code != 0) {
		if (code == 1) {
			end_record_seen = 1;
			return 1;
		}
		if (code == 2 && len == 2) {
			//if (!sscanf(ptr, "%04x", &i)) return 1;
			i = parseInt(line.substr(ptr, 4), 16);
			if (isNaN(i)) {
				return 1;
			}

			ptr += 4;
			sum += ((i >> 8) & 255) + (i & 255);
			//if (!sscanf(ptr, "%02x", &cksum)) return 1;
			cksum = parseInt(line.substr(ptr, 2), 16);

			if (((sum & 255) + (cksum & 255)) & 255)
				return 1;
			extended_addr = i << 4;
			//printf("ext addr = %05X\n", extended_addr);
		}
		if (code == 4 && len == 2) {
			//if (!sscanf(ptr, "%04x", &i)) return 1;
			i = parseInt(line.substr(ptr, 4), 16);
			if (isNaN(i)) {
				return 1;
			}

			ptr += 4;
			sum += ((i >> 8) & 255) + (i & 255);
			//	if (!sscanf(ptr, "%02x", &cksum)) return 1;
			cksum = parseInt(line.substr(ptr, 2), 16);
			if (isNaN(cksum)) {
				return 1;
			}

			if (((sum & 255) + (cksum & 255)) & 255)
				return 1;
			extended_addr = i << 16;
			//printf("ext addr = %08X\n", extended_addr);
		}
		return 1; // non-data line
	}
	byte_count += len;
	while (num != len) {
		//if (sscanf(ptr, "%02x", &i) != 1) return 0;
		i = parseInt(line.substr(ptr, 2), 16);
		if (isNaN(i)) {
			return 0;
		}

		i &= 255;
		firmware_image[addr + extended_addr + num] = i;
		firmware_mask[addr + extended_addr + num] = 1;
		ptr += 2;
		sum += i;
		(num)++;
		if (num >= 256)
			return 0;
	}
	//if (!sscanf(ptr, "%02x", &cksum)) return 0;
	cksum = parseInt(line.substr(ptr, 2), 16);
	if (isNaN(cksum)) {
		return 0;
	}

	if (((sum & 255) + (cksum & 255)) & 255)
		return 0;
	/* checksum error */
	return 1;
}

// options (from user via command line args)
var wait_for_device_to_appear = 0;
var hard_reboot_device = 0;
var reboot_after_programming = 1;
var verbose = 0;
//var code_size = 0
//var block_size = 0;
var end_record_seen = 0;
var extended_addr = 0;
var byte_count = 0;
var code_size = 262144;
var block_size = 1024;
var teensy_handle = 0;
var libusb_teensy_handles = [];

function teensy_close() {
	if (!hidConnection)
		return;
	chrome.hid.disconnect(hidConnection.connectionId);
	hidConnection = 0;
}

function teensy_open() {
	teensy_close();
	open_hid_device(0x16C0, 0x0478, onHidDeviceFound);
}

var MAX_MEMORY_SIZE = 0x20000

var firmware_image = new Uint8Array(MAX_MEMORY_SIZE);
var firmware_mask = new Uint8Array(MAX_MEMORY_SIZE);
for (i = 0; i < MAX_MEMORY_SIZE; i++) {
	firmware_image[i] = 0xFF;
	firmware_mask[i] = 0;
}

function ihex_bytes_within_range(begin, end) {
	var i;
	if (begin < 0 || begin >= MAX_MEMORY_SIZE ||
		end < 0 || end >= MAX_MEMORY_SIZE) {
		return 0;
	}
	for (i = begin; i <= end; i++) {
		if (firmware_mask[i])
			return 1;
	}
	return 0;
}

var afterTeensyWrite = 0;
var writeTimeout = 0;
function teensy_write(success) {
	if (success) {
		afterTeensyWrite = success;
	}

	var r = 0;
	if (writeTimeout > 0) {
		chrome.hid.send(hidConnection.connectionId, 0, buf.buffer, hidTransferCallback);
	} else {
		console.log("Write Timeout");
		return 0;
	}
}

var transfer_count = 0;
var transfer_return = 0;
var transfer_result = 0;
function hidTransferCallback(event) {
	console.log("transfer ", transfer_count++);

	//	console.log("resultCode: ", event.resultCode);
	//if (event.resultCode != 0)
	//{
	if (chrome.runtime.lastError) {
		console.log(chrome.runtime.lastError);
		transfer_result = -1;
		writeTimeout -= 0.01;
		setTimeout(teensy_write, 10); //try again
	} else {
		transfer_result = 1;
		afterTeensyWrite();
	}
	transfer_return = 1;
}

var buf = new Uint8Array(block_size + 64);
var first_block = 1;
var addr = 0;
function write_hex() {
	if (addr < code_size) {

		if (first_block) {
			console.log("Programming");
		}

		if (!first_block && !ihex_bytes_within_range(addr, addr + block_size - 1)) {
			// don't waste time on blocks that are unused,
			// but always do the first one to erase the chip
			console.log("ununsed", addr);
			addr += block_size;
			write_hex();
		} else if (!first_block && memory_is_blank(addr, block_size)) {
			console.log("blank", addr);
			addr += block_size;
			write_hex();

		} else {
			//for (var addr = 0; addr < code_size; addr += block_size) {

			console.log(".");

			buf[0] = addr & 255;
			buf[1] = (addr >> 8) & 255;
			buf[2] = (addr >> 16) & 255;

			//memset(buf + 3, 0, 61);
			for (i = 3; i < 64; i++)
				{
				buf[i] = 0;
			}

			//ihex_get_data(addr, block_size, buf + 64);
			len = block_size;
			_addr = addr;
			if (_addr < 0 || len < 0 || _addr + len >= MAX_MEMORY_SIZE) {
				for (i = 0; i < len; i++) {
					buf[64 + i] = 255;
				}
			}
			for (i = 0; i < len; i++) {
				if (firmware_mask[_addr]) {
					buf[64 + i] = firmware_image[_addr];
				} else {
					buf[64 + i] = 255;
				}
				_addr++;
			}
			console.log("addr:", addr.toString(16));
			console.log(buf);

			write_size = block_size + 64;

			writeTimeout = first_block ? 3.0 : 0.25
				addr += block_size
				first_block = 0;
			r = teensy_write(write_hex);

		}
	} else {

		console.log("\n");
		// reboot to the user's new code
		if (reboot_after_programming) {
			console.log("Booting\n");

			for (var i = 0; i < write_size; i++) {
				buf[i] = 0;
			}
			buf[0] = 0xFF;
			buf[1] = 0xFF;
			buf[2] = 0xFF;

			//memset(buf + 3, 0, sizeof(buf) - 3);
			writeTimeout = 0.25;
			teensy_write(teensy_close);
		}
	}
}

var hidConnection = 0;
function onHidOpenCallback(connection) {
	if (connection) {
		hidConnection = connection;
		console.log("Hid Device Connected.");
		first_block = 1;
		addr = 0;
		write_hex();

	} else {
		console.log("Device failed to open.");
	}
}

function onHidDeviceFound(devices) {
	teensy_handles = devices;
	if (devices) {
		if (devices.length > 0) {
			console.log("Device(s) found: " + devices.length);
			teensy_handle = devices[0];
			chrome.hid.connect(teensy_handle.deviceId, onHidOpenCallback);
		} else {
			console.log("Device could not be found retrying");
			setTimeout(teensy_open, 10);
		}
	} else {
		console.log("Permission denied.");
	}
}

function memory_is_blank(addr, block_size) {
	if (addr < 0 || addr > MAX_MEMORY_SIZE)
		return 1;
	while (block_size && addr < MAX_MEMORY_SIZE) {
		if (firmware_mask[addr] && firmware_image[addr] != 255)
			return 0;
		addr++;
		block_size--;
	}
	return 1;
}

function open_hid_device(vid, pid, cb) {
	chrome.hid.getDevices({
		"vendorId" : vid,
		"productId" : pid
	}, cb);
}

var rebootor = 0;
function hard_reboot() {
	open_usb_device(0x16C0, 0x0477, function (devices) {
		rebootor = devices;
		if (devices) {
			if (devices.length > 0) {
				console.log("Device(s) found: " + devices.length);
			} else {
				console.log("Device could not be found");
			}
		} else {
			console.log("Permission denied.");
		}
	});
}
