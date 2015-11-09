var xsltea = (function (CodeMirror) {
	var config = {
		changeDelay: 1500,
		apiUrl: 'https://xsltea-api.herokuapp.com'
		//apiUrl: 'http://localhost/xsltea-api'
	};
	var apiLoaded = false;
	var imports = {};
	var pauseAutoUpdate = false;
	var parsedXSL;

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
				mode: null,
				lineWrapping: true
			}
		}
	};

	function init() {
		// Build the editors
		buildEditors(editors);

		// Load from localStorage
		loadFromLocalStorage();

		// Binding events
		bindEditorsEvents(editors);

		// Initial parse
		transform();

		// Show server utilities in console
		showServerUtilities();
	}

	/**
	 *
	 * Local Storage
	 *
	 */
	function saveToLocalStorage() {
		localStorage.setItem('xml', editors.xml.element.value);
		localStorage.setItem('xsl', editors.xsl.element.value);
		localStorage.setItem('imports', JSON.stringify(imports));
	}

	function loadFromLocalStorage() {
		if (localStorage.xml) {
			editors.xml.editor.setValue(localStorage.xml);
		}

		if (localStorage.xsl) {
			editors.xsl.editor.setValue(localStorage.xsl);
		}

		if (localStorage.imports) {
			try {
				imports = JSON.parse(localStorage.imports);	
			} catch (e) {
				console.log('Error parsing import');
			}
		}
	}

	/**
	 *
	 * Ajax calls
	 *
	 */
	function getServerUtilities(callback) {
		$.get(config.apiUrl + '/utilities', function (data) {
			try {
				var parsedData = JSON.parse(data);

				callback(parsedData);
			} catch (e) {
				console.log(e);
			}
		});
	}

	function transform() {
		$.ajax({
			type: 'POST',
			url: config.apiUrl + '/parse',
			data: {
				xml: editors.xml.editor.getValue(),
				xsl: editors.xsl.editor.getValue(),
				import: imports
			},
			success: function (data) {
				processResult(data);
			},
			error: function (data) {
				processResult(data, true);
			}
		});
	}

	/**
	 *
	 * Server-side utilities
	 *
	 */
	function showServerUtilities() {
		getServerUtilities(function (utilities) {
			var consoleMessage = 'The following server-side utilities are available: ';

			for (var i = 0; i < utilities.length; i++) {
				consoleMessage += "\n --> " + utilities[i].path + ' (' + utilities[i].description + ' — ' + utilities[i].url + ')';
			}

			writeToConsole(consoleMessage);
			writeToConsole('You can also include your own. Just drag an XSL file to the editor.');
		});
	}

	/**
	 *
	 * Editors and events
	 *
	 */
	function buildEditors(editors) {
		for (var key in editors) {
			if (editors.hasOwnProperty(key)) {
				editors[key].element = document.getElementById(editors[key].id);
				editors[key].editor = CodeMirror.fromTextArea(editors[key].element, editors[key].config);
			}
		}
	}

	function bindEditorsEvents(editors) {
		for (var key in editors) {
			if (editors.hasOwnProperty(key)) {
				if ('triggersChange' in editors[key]) {
					editors[key].editor.on('change', debounce(function (cm, event) {
						console.log(event);
						if (event.origin !== 'setValue') {
							processChange(cm);
						}
					}, config.changeDelay));
				}
			}
		}

		editors.xsl.editor.on('drop', function (cm, event) {
			var file = event.dataTransfer.files[0];
        	var reader = new FileReader();

    		reader.onload = function (event) {
    			imports[file.name] = event.target.result;

    			transform();
    		};

    		reader.readAsText(file);

			event.preventDefault();
		});
	}

	function insertXSLImport(href) {
		var parser = new DOMParser();
		var serializer = new XMLSerializer();

		var xslDoc = parser.parseFromString(editors.xsl.editor.getValue(), 'text/xml');
		var importNode = xslDoc.createElement('xsl:import');
		importNode.setAttribute('href', 'test.xsl');

		xslDoc.documentElement.insertBefore(importNode, xslDoc.documentElement.childNodes[0]);

		return serializer.serializeToString(xslDoc);
	}

	function processChange(cm) {
		cm.save();

		saveToLocalStorage();

		if (!pauseAutoUpdate) {
			transform();
		}
	}

	function writeToConsole(message) {
		var current = editors.console.editor.getValue();

		if (current.length) {
			current = current + "\n\n";
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

	function processResult(data, error) {
		if (!apiLoaded) {
			apiLoaded = true;

			$('body').removeClass('loading');
		}

		if (!error) {
			var parsedData = JSON.parse(data);

			for (var importName in imports) {
				if (imports.hasOwnProperty(importName) && (parsedData.imports.indexOf(importName) == -1)) {
					delete imports[importName];
				}
			}

			if ('result' in parsedData) {
				editors.output.editor.setValue(parsedData.result);

				autoIndent(editors.output.editor);

				writeToConsole('Parsing complete in ' + parsedData.time + ' microseconds');
			}
		} else {
			var parsedData = JSON.parse(data.responseText);
			var errorMessage = '';

			if ('errors' in parsedData) {
				for (var errorType in parsedData.errors) {
					if (parsedData.errors.hasOwnProperty(errorType)) {
						errorMessage += errorType + " error:\n";

						if (typeof parsedData.errors[errorType] === 'string') {
							errorMessage += '--> ' + parsedData.errors[errorType];
						} else {
							for (var i = 0; i < parsedData.errors[errorType].length; i++) {
								errorMessage += "--> " + parsedData.errors[errorType][i];
							}
						}
					}
				}

				writeToConsole(errorMessage);
			}

			editors.output.editor.setValue('');
		}
	}

	function autoIndent(editor) {
		return;
		var lineCount = editor.lineCount();

		pauseAutoUpdate = true;

		for (var i = 1; i <= lineCount; i++) {
			editor.indentLine(i);
		}

		pauseAutoUpdate = false;
	}

	// Initialise
	init();

	return {
		editors: editors,
		test: function () {
			localStorage.removeItem('xml');
			localStorage.removeItem('xsl');
			localStorage.removeItem('imports');
		},
		imports: imports
	}
})(CodeMirror);