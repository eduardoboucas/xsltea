var xsltea = (function (CodeMirror) {
	var config = {
		changeDelay: 1500,
		codeMirror: {
			lineNumbers: true,
			theme: 'base16-light'
		},
		apiUrl: 'https://xsltea-api.herokuapp.com'
		//apiUrl: 'http://localhost/xsltea-api'
	}

	var editors = {
		xml: {
			id: 'code-xml',
			config: {
				lineNumbers: true
			},
			triggersChange: true
		},
		xsl: {
			id: 'code-xsl',
			config: {
				lineNumbers: true
			},
			triggersChange: true
		},
		output: {
			id: 'code-output',
			config: {
				lineNumbers: true,
				readOnly: true
			}
		},
		console: {
			id: 'code-console',
			config: {
				lineNumbers: false,
				readOnly: true,
				mode: null
			}
		}
	};

	function init() {
		// Build the editors
		buildEditors(editors);

		// Initial parse
		parse();
	}

	function buildEditors(editors) {
		for (var key in editors) {
			if (editors.hasOwnProperty(key)) {
				editors[key].element = document.getElementById(editors[key].id);
				editors[key].editor = CodeMirror.fromTextArea(editors[key].element, editors[key].config);

				if ('triggersChange' in editors[key]) {
					editors[key].editor.on('change', debounce(function (cm) {
						processChange(cm);
					}, config.changeDelay));
				}
			}
		}
	}

	function processChange(cm) {
		cm.save();

		parse();
	}

	function writeToConsole(message) {
		var current = editors.console.editor.getValue();

		if (current.length) {
			current = current + "\n";
		}

		editors.console.editor.setValue(current + message);
		editors.console.editor.execCommand('goPageDown');
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
				xml: editors.xml.element.value,
				xsl: editors.xsl.element.value
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
				editors.output.editor.setValue(parsedData.result);

				writeToConsole('Parsing complete in ' + parsedData.time + ' microseconds');
			}			
		} else {
			var parsedData = JSON.parse(data.responseText);
			var errorMessage = '';

			if ('errors' in parsedData) {
				for (var errorType in parsedData.errors) {
					if (parsedData.errors.hasOwnProperty(errorType)) {
						errorMessage += errorType + " error:\n";

						for (var i = 0; i < parsedData.errors[errorType].length; i++) {
							errorMessage += "--> " + parsedData.errors[errorType][i];
						}
					}
				}

				writeToConsole(errorMessage);
			}
		}
	}

	// Initialise
	init();
})(CodeMirror);