var xsltea = (function (CodeMirror) {
	var config = {
		changeDelay: 1500,
		codeMirror: {
			lineNumbers: true,
			theme: 'base16-light'
		},
		apiUrl: 'http://xsltea-api.herokuapp.com'
		//apiUrl: 'http://localhost/xsltea-api'
	}

	var xmlTextArea = document.getElementById('code-xml');
	var xslTextArea = document.getElementById('code-xsl');
	var outputTextArea = document.getElementById('code-output');
	var consoleTextArea = document.getElementById('code-console');

	var xmlCodeMirror = CodeMirror.fromTextArea(xmlTextArea, config.codeMirror);
	var xslCodeMirror = CodeMirror.fromTextArea(xslTextArea, config.codeMirror);
	var outputCodeMirror = CodeMirror.fromTextArea(outputTextArea, config.codeMirror);
	var consoleCodeMirror = CodeMirror.fromTextArea(consoleTextArea, config.codeMirror);

	xmlCodeMirror.on('change', debounce(function (cm) {
		cm.save();

		parse();
	}, config.changeDelay));

	xslCodeMirror.on('change', debounce(function (cm) {
		cm.save();

		parse();
	}, config.changeDelay));

	parse();

	function writeToConsole(message) {
		var current = consoleCodeMirror.getValue();

		if (current.length) {
			current = current + "\n";
		}

		consoleCodeMirror.setValue(current + message);
	}

	function debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	}

	function parse() {
		$.ajax({
			type: 'POST',
			url: config.apiUrl + '/parse',
			data: {
				xml: xmlTextArea.value,
				xsl: xslTextArea.value
			},
			success: function (data) {
				processResult(data);
			},
			error: function (data) {
				processResult(data, true);
			}
		});
	}

	function processResult(data, error) {
		if (!error) {
			var parsedData = JSON.parse(data);

			if ('result' in parsedData) {
				outputCodeMirror.setValue(parsedData.result);

				writeToConsole('Parsing complete in ' + parsedData.time + ' microseconds');
			}			
		} else {
			var parsedData = JSON.parse(data.responseText);
			var errorMessage = '';

			if ('errors' in parsedData) {
				for (var errorType in parsedData.errors) {
					if (parsedData.errors.hasOwnProperty(errorType)) {
						errorMessage += errorType + " error:\n";

						console.log(parsedData.errors[errorType])

						for (var i = 0; i < parsedData.errors[errorType].length; i++) {
							errorMessage += "--> " + parsedData.errors[errorType][i];
						}
					}
				}

				writeToConsole(errorMessage);
			}
		}
	}

	return {
		writeToConsole: writeToConsole
	}
})(CodeMirror);