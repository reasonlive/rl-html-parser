const http = require('http');
const https = require('https');
const fs = require('fs');
const {ParserError, InputDataError} = require('./Errors');

/**
 *
 */
class RLHtmlParserBase {

	/**
	 * RLHtmlparserBase instance
	 * @returns {RLHtmlParserBase}
	 */
	constructor() {
		this.#html = null;
		this.#tagsBuffer = {};
		this.#timer = 0;

		const className = this.constructor.name;
		if (className === 'RLHtmlParserBase') {
			throw new ParserError(null, `Making ${className} instances is forbidden`);
		}

		return this;
	}

	/**
	 * Website links to be parsed
	 * @type {Set}
	 */
	#links;

	get links() {
		return this.#links.values();
	}

	set links(links) {
		this.#links = new Set(links);
	}

	/**
	 * Buffer for all tags on the parsed webpage
	 * @type {Object} [tagsBuffer[tagName]: {string[]}]
	 */
	#tagsBuffer;

	/**
	 * String in UTF-8 of all html page
	 * @type {string|null} html
	 */
	#html;

	/**
	 * Add webpage as html string
	 * @param {string} html - Whole html of a page
	 * 
	 * @private
	 */
	_addPage(html){
		this.#html = html;
	}

	/**
	 * Clear html string buffer
	 * 
	 * @private
	 */
	_clearPage(){
		this.#html = null;
		this.#tagsBuffer = {};
	}

	/**
	 * @private 
	 */
	_isHtml() {
		return this.#html?.match(/.*?<html/gi);
	}

	/**
	 * Goes to the webpage and parse its data
	 * @param {string} link
	 * @returns {Promise<boolean>} true if html string was received
	 * 
	 * @protected
	 */
	async goto(link) {
		this._clearPage();

		try {
			this._addPage(await this._request(link));
		} catch (err) {
			console.log(new ParserError(err).getMessage());
			return false;
		}

		if (!this._isHtml()) {
			this._clearPage();
			return false;
		}

		this._parse();
		return true;
	}

	/**
	 * Tags which may have the same tags inside
	 * @type {string[]}
	 * 
	 * @private
	 */
	#nestedTags = ['div', 'span', 'p'];

	/**
	 * Tags doesn't have closing tag
	 * @type {string[]}
	 * 
	 * @private
	 */
	#singleTags = ['link', 'meta', 'img'];

	/**
	 * Tags which may not have any values and attributes
	 * @type {string[]}
	 * 
	 * @private
	 */
	#wrapperTags = ['html', 'head', 'body', 'section'];

	/**
	 * Find target tag in innerHTML of the other tags
	 *  and write all found tag lines into this.#tagsBuffer
	 *
	 * @param {string} tag
	 * @returns {string[]} All found tags as a html line with value and attributes
	 * @private
	 */
	_findTags(tag) {
		if (this.#tagsBuffer[tag]) {
			return this.#tagsBuffer[tag];
		}

		this.#tagsBuffer[tag] = [];
		Object.keys(this.#tagsBuffer).forEach((bufferTag) => {
			if (tag !== bufferTag) {
				this.#tagsBuffer[bufferTag].forEach((outerHTML) => {
					const tagMatchList = outerHTML.match(this.getTagRegex(tag, 'gimsu'));

					if (tagMatchList) {
						tagMatchList.forEach((elem) => {
							this.#tagsBuffer[tag].push(elem);
						})
					}
				})	
			}
		})

		return this.#tagsBuffer[tag];
	}

	/**
	 * Finds target tags recursively for nested tags
	 *
	 * @param {string} tag - Target tags to find
	 * @param {string} outerHTML - Piece of string where need to search
	 * @param {string[]} buffer - Where found lines collect to
	 *
	 * @returns {string[]} All found lines with the target tag
	 * @private
	 */
	_findTagsRecursively(tag, outerHTML, buffer = []) {
		if (!outerHTML) {
			return buffer;
		}
		
		let chunk, openedMatch, closedMatch, startIndex;

		const openedRegex = new RegExp(`<${tag}.*?>.*?`, 'gimsu');
		const closedRegex = new RegExp(`<\/${tag}>`, 'gimsu');

		if (closedMatch = closedRegex.exec(outerHTML)) {
			while (true) {
				if (openedMatch = openedRegex.exec(outerHTML)) {

					if (openedRegex.lastIndex > closedMatch.index) {
						break;
					}
					else {
						startIndex = openedMatch.index;
					}	
				}
				else {
					break;
				}
			}
			
			if (startIndex) {
				// carve the substring of the deepest tag
				chunk = outerHTML.slice(startIndex, closedRegex.lastIndex);
				// check the substring on different nested tags
				this._parseOuterHTML(chunk, tag);
				// push the tag to buffer
				buffer.push(chunk);

				// make outerHTML without tag substring we pushed above
				outerHTML = outerHTML.slice(0, startIndex)
				+ outerHTML.slice(closedRegex.lastIndex);
			}
			else {
				buffer.push(outerHTML);
				return buffer;
			}
		}
		else {
			return buffer;
		}

		return this._findTagsRecursively(tag, outerHTML, buffer);
	}

	/**
	 * Takes tags buffer and move up all the nested tags it has, using this._findTagsRecursively
	 * @private
	 */
	_hoistNestedTags() {
		const keys = Object.keys(this.#tagsBuffer);
		keys.forEach(tag => {
			if(!this.#singleTags.includes(tag)){
				const buff = [];
				while(this.#tagsBuffer[tag].length > 0) {
					let tagString = this.#tagsBuffer[tag].pop();
					this._findTagsRecursively(tag, tagString, buff);
				}

				this.#tagsBuffer[tag] = buff;
			}
		})
	}

	/**
	 * Process of parsing the whole html page string
	 * @param {string} outerHTML - Html string to be parsed
	 * @param {string|null} missedTag - Which tag name should be missed
	 * @private
	 */
	_parseOuterHTML(outerHTML, missedTag = null) {
		if (!outerHTML) {
			throw new ParserError(null, 'parseOuterHTML() needs data to argument');
		}

		let chunk = ''; // substring from opened to closed tag
		let opened = false; // opened tag is detected
		let closed = false; // closed tag is detected
		let openCount = 0; // depth of same nested tags
		let tag; // tag name

		for (let i = 0; i < outerHTML.length; i++) {
			const char = outerHTML[i];

			if (char === '<') {
				switch (outerHTML[i + 1]) {
					case '!': {
						const commentRegex = />/g;
						commentRegex.exec(outerHTML.slice(i));
						i += commentRegex.lastIndex - 1;
						continue;
					}

					case 'b': {
						if (outerHTML[i + 2] === 'r') {
							const commentRegex = />/g;
							commentRegex.exec(outerHTML.slice(i));
							i += commentRegex.lastIndex - 1;
							continue;
						}

						break;
					}

					case '/':
						closed = true;
						break;

					default:
						opened = true;
				}

				const regex = /<\/?(\w+).*?>/gimsu;
				let match = regex.exec(outerHTML.slice(i));

				if (opened) {

					if (match) {

						if (match[1] == missedTag) {
							opened = false;
							continue;
						}

						if (!tag) {
							tag = match[1];
							// console.log(tag)
							openCount++;
							/*if(!openCount || openCount < 0){
								console.log(tag);process.exit()
							}*/
						} else {
							if (tag === match[1]) {
								if (closed) openCount--;
								else openCount++;
							}
						}

						if (tag && this.#wrapperTags.includes(tag)) {
							chunk = '';
							tag = undefined;
							openCount--;
							opened = closed = false;

							i += (regex.lastIndex - 1);
							continue;
						}
					}

					if (this.#singleTags.includes(tag)) {
						openCount--;
						closed = true;
					}
				} else if (closed) {
					if (match && this.#wrapperTags.includes(match[1])) {
						closed = false;
						i += match[1].length + 1;
						continue;
					}
				}
			}

			if (char === '>') {
				if (opened && closed) {
					/*console.log(openCount)
					if(openCount < 0){
						console.log(result)
						console.log(chunk);process.exit()
					}*/
					if (openCount === 0) {
						if (!this.#tagsBuffer[tag]) {
							this.#tagsBuffer[tag] = [];
						}

						if (tag !== missedTag) {
							this.#tagsBuffer[tag].push(chunk += char);
						}


						chunk = '';
						opened = closed = false;
						tag = undefined;
					} else {
						closed = false;
					}
				}
			}

			if (opened) {
				if (char.match(/[\r|\n|\t]+/g)) {
					continue;
				}

				chunk += char;
			}
		}
	}

	/**
	 * Main parsing method of the current webpage
	 * @private
	 */
	_parse() {
		this._parseOuterHTML(this.#html);
		this._hoistNestedTags();
	}

	/**
	 * GET/POST requests for taking webpage as html utf-8 string
     * POST requests not available yet
	 *
	 * @param {string} website Full URL of website
	 * @param {JSON|null} body For post requests
	 * @returns {Promise<string|null>} html string from response
	 *
	 * @private
	 */
	async _request(website, body = null) {
		if (!website.match(/^https?:\/\/.*$/)) {
			return null;
		}

		let protocol = website.slice(0, website.indexOf('//') - 1);
		let hostname = website.slice(website.indexOf('//') + 2);
		let pathIndex = hostname.indexOf('/');

		let path = pathIndex < 0 ? '/' : hostname.slice(pathIndex);
		path = encodeURI(path);

		hostname = hostname.substr(0, pathIndex < 0 ? hostname.length+1 : pathIndex)

		let port = protocol === 'http' ? 80 : 443;
		const protocolModule = protocol === 'http' ? http : https;

		let method = body ? 'POST' : 'GET';

		let options = {
			hostname,
			port,
			path,
			method,
		}

		if (body) {
			// body as a JSON string only
			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': body.length,
			}
		}

		let data = await new Promise(async (res, rej) => {

			try{
				let buff; // body of a webpage in binary
				let req = await protocolModule.request(options, (response) => {
					 response.on('data', data => {

						if (!buff) {
							buff = data;
						}
						else {
							buff = Buffer.concat([buff, data]);
						}
					})

					response.on('error', (err) => rej(err));
					response.once('close', () => res(buff?.toString()));
				});

				req.on('error', (err) => rej(err));
				req.end();
			}
			catch (err) {
				rej(err);
			}

			/*if(body){
				req.write(body);
			}*/
		});

		return data;
	}

	/**
	 * Gets regular expression for DOM element from opened to closed tag
	 * @param {string} tag - Target tag name
	 * @param {string} flags - Flags for RegExp instance
	 * @returns {RegExp}
	 *
	 * @private
	 */
	getTagRegex(tag, flags = 'imsu') {
		let str = `<${tag}\\b.*?`;
		if (this.#singleTags.includes(tag)) {
			str += `\/?>`;
		}
		else {
			str += `>(.*?)<\/${tag}>`;
		}

		return new RegExp(str, flags);
	}

	/**
	 * Find different tag as nested if it is inside
	 * @param {string} innerHTML - String inside a parent tag
	 * @param {Object[]} children - Nested tags in selector, example: tag1 > tag2 > tag3
	 * @returns {Object|null} All attributes of found child tag
	 *
	 * @private
	 */
	findNestedTag(innerHTML, children) {
		let deepestChild = children[children.length-1],
			destructed = this._parseTagAttributes(deepestChild.attrs),
			patterns = [];

		Object.keys(destructed).forEach((key) => {
			let val;
			if (key === 'attr') {
				let attr = Object.keys(destructed[key])[0];

				val = destructed[key][attr];
				key = attr;
			}
			else{
				val = destructed[key];
			}

			patterns.push(`${key}=['|"]+${val}['|"]+`);
		})

		let match;
		if (patterns.length) {
			let basePattern = `.*?<${deepestChild.tag}.*?{}.*?>(.*?)<\/${deepestChild.tag}>.*?`;

			for(let pattern of patterns) {
				if(!(match = innerHTML.match(basePattern.replace('{}', pattern)))) {
					return null;
				}
			}
		}
		else {
			match = innerHTML.match(this.getTagRegex(deepestChild.tag));
		}

		return match ? this._turnTagStringIntoObject(match[0]) : null;
	}

	/**
	 * For selectors that may be the target for parsed data
	 * Selectors that maintained:
	 * 	[tag#id, tag.class, tag#id.class.class, tag#id > tag.class, tag[attr($|^|*)=value]]
	 *
	 * @returns {RegExp} for selector that may used
	 * @private
	 */
	_getSelectorRegex() {
		return /[#\.\[>\s]+[\w-_="'\]\*\^\$\~\|\/]+/g;
	}

	/**
	 * Splits selector string into tag name and tag attributes
	 * @param {string} selector - String in format: tag#id.class etc.
	 * @returns {Object} [{string} tag, {string[]} attrs, {string[]} children]
	 * @private
	 */
	_splitSelector(selector) {
		if (!selector || typeof selector !== 'string') {
			throw new InputDataError(`Bad selector: ${selector}`);
		}
		//selector = 'div#description > div.styles_text';
		let tag, result = {}, charIndex, parent, children;


		if ((charIndex = selector.indexOf('>')) !== -1) {

			parent = selector.slice(0, charIndex).trim();
			children = selector.slice(charIndex).replace(/\s/g, '').split('>');

			children.forEach((item) => {
				if (!result.children) {
					result.children = [];
				}

				if (item) {
					result.children.push(this._splitSelector(item))
				}
			})

			result.attrs = parent.match(this._getSelectorRegex()) ?? [];

			if (result.attrs.length) {
				result.tag = parent.slice(0, parent.indexOf(result.attrs[0].charAt(0)));
			} else {
				result.tag = parent;
			}
		}
		else {
			let match = selector
				?.match(this._getSelectorRegex())
				?.map(value => value.replace(/\s/g, ''))
				?? [];

			tag = match.length
				? selector.slice(0, selector.indexOf(match[0].charAt(0)))
				: selector;

			result.tag = tag;
			result.attrs = match;
		}

		return result;
	}

	/**
	 * Parse tag attributes
	 * @param {string[]} attrs - Attributes of a tag
	 *
	 * @returns {Object}
	 * 	[{string} id, {string[]} class, {Object} attr [{string} name, {char} mode, {Function} handler]]
	 * @private
	 */
	_parseTagAttributes(attrs) {
		const result = {};
		attrs.forEach((item) => {
	 		switch(item.charAt(0)){
	 			case '#':
	 			 	result.id = item.slice(1);
	 			break;

	 			case '.':
	 				if (!result['class']) {
						result.class = [];
					}

	 			 	result.class.push(item.slice(1));
	 			break;

	 			case '[':
	 				//item = '[href|=some]';
	 				const pair = item.slice(1, item.indexOf(']')).split('=');
	 				let attrName = pair[0];

	 				let mode = attrName.slice(-1).match(/\$|\*|\^|\~|\|/);
	 				attrName = mode ? attrName.slice(0, attrName.length-1) : attrName;

	 				result.attr = {
	 					[attrName] : pair.length > 1 ? pair[1] : null,
	 					mode: mode ? mode[0] : null
	 				};

					switch (result.attr.mode) {
						case '*': result.attr.handler = function(item) {
							return item[attrName]?.includes(this[attrName]);
						}
						break;

						case '^': result.attr.handler = function(item) {
							return item[attrName]?.startsWith(this[attrName]);
						}
						break;

						case '$': result.attr.handler = function(item) {
							return item[attrName]?.endsWith(this[attrName]);
						}
						break;

						case '|':
						case '~':
						break;

						default: result.attr.handler = function(item) {
							return item[attrName] === this[attrName];
						}
					}
	 			break;

	 			case '>':
	 				//tagStructure.child = item.slice(1);
	 			break;
	 		}
	 	})

		return result;
	}

	/**
	 * Parse all the tags found by tag name in the #tagsBuffer
	 * @param {string} tag - Name of a tag to parse
	 * @returns {Object[]} [{string} attrName, {string} attrValue]
	 * @private
	 */
	_parseTags(tag) {
		if (!tag) {
			throw new InputDataError('Need to provide html tag');
		}

		const tags = this._findTags(tag);

		if (tags.length < 1) {
			throw new InputDataError(`Tag ${tag} doesn't exist in HTML structure`);
		}

		const result = [];
		tags.forEach((item) => {
			result.push(this._turnTagStringIntoObject(item));
		})

		return result;
	}

	/**
	 * Gets html tag string and turn it into object
	 * @param tagStr - string from opened to closed tag
	 * @returns {Object}
	 *
	 * @private
	 */
	_turnTagStringIntoObject(tagStr) {
		const attrs = {}; // all attributes of the target tag
		const index = tagStr.search(/>|\s/);
		const tag = tagStr.slice(1, index);

		for (let pair of tagStr.matchAll(/(\w+)=["|'](.*?)["|']/gi)) {
			const [,attr, attrValue] = pair;
			attrs[attr.trim()] = attrValue.replace(/"/g, '').trim();
		}

		attrs.value = tagStr.slice(
			tagStr.indexOf('>') + 1,
			tagStr.lastIndexOf('</')
		);

		if(
			(attrs.value.indexOf(`<${tag}`) !== -1)
			&& attrs.value.indexOf(`</${tag}>`) === -1
		) {
			let tagsAmount = attrs.value.match(new RegExp(`<${tag}\\b`, 'gi')).length;
			attrs.value += `</${tag}>`.repeat(tagsAmount);
		}

		return {
			tagName: tag,
			...attrs
		};
	}

	/**
	 * Parse html elements that matches the selector
	 * @param selector - Selector of the html element
	 * @returns {Object[]} Attributes of html elements with values
	 * 
	 * @protected
	 */
	parseSelector(selector) {
		const result = [];
		//tag: tag name, attrs: tag attrs, children: other nested tags inside
		let {tag, attrs, children} = this._splitSelector(selector);

		const parsedTags = this._parseTags(tag); // find all the suitable tags in the html
		const tagStructure = this._parseTagAttributes(attrs);

		if (!attrs.length && !children?.length) {
			return parsedTags;
		}

		parsedTags.forEach((item) => {
			let found; // true if target tag was found

			//check id attributes are equal
			if (tagStructure.id) {
				found = item.id === tagStructure.id;
			}

			//check class attributes are equal
			if (tagStructure.class && item.class) {
				let matches = 0, itemClassesList = item.class.split(' ');

				if (itemClassesList.length >= tagStructure.class.length) {

					itemClassesList.forEach((item) => {
						if(tagStructure.class.includes(item))
							matches++;
					})

					let classFound = itemClassesList.length == tagStructure.class.length
						? itemClassesList.length == matches
						: matches > 0;

					found = found !== undefined ? found && classFound : classFound;
				}
				else {
					found = false;
				}
			}

			//check specific attributes are equal
			if (tagStructure.attr) {

				let attrFound = tagStructure.attr.handler(item);
				found = found !== undefined ? found && attrFound : attrFound;
			}

			if (found || found === undefined) {
				result.push(item);
			}
		})

		if (children) {
			result.forEach((item) => {
				item.child = this.findNestedTag(item.value, children);
			});

			return result.map(item => item.child).filter(item => item != null);
		}

		return result;
	}

	/**
	 * Parse all elements matches the selector
	 * Gets the values of the elements by default
	 * If need to use all the attributes use this.parseSelector instead
	 *
	 * @param {string} selector - Selector of html element
	 * @param {string} attr - Attribute of html element which value we expected of
	 * @returns {string[]} Values of the parsed elements by default
	 *
	 * @protected
	 */
	parseElements(selector, attr){
		return this.parseSelector(selector)?.map(elem => elem[attr]) ?? [];
	}

	/**
	 *
	 * @param {string} path Full path with extension
	 * @param {string} data String in UTF8 format
	 * @returns {Promise<boolean|*>} true if file was written
	 * @public
	 */
	async writeFile(path, data){

		try{
			const fd = await fs.promises.open(path, 'w');
			await fd.writeFile(data)
			await fd.close()
		}
		catch(err){
			return new ParserError(err, 'File write stream error');
		}

		return true;
	}

	/**
	 * Read file from the path
	 * @param {string} path - Where file is located
	 * @returns {Promise<string|null>} Data from the file, null if reading failed
	 * @public
	 */
	async readFile(path){
		let data;
		try{
			data = await fs.promises.readFile(path, 'utf-8');
		}
		catch(err){
			throw new ParserError(err, 'File read stream error');
		}

		return data;
	}

	/**
	* Timer for speed benchmarking
	* @type {number} timer
	*/
	#timer = 0;

	/**
	 * Measures all the process
	 * @type {number}
	 */
	static PROCESS_TIME_MODE = 1;
	/**
	 * Measures single iteration inside the particular method
	 * @type {number}
	 */
	static ITERATION_TIME_MODE = 2;

	startTimer() {
		this.#timer = Date.now();
	}

	/**
	* @returns {string} Message about execution time
	*/
	renderTimer(mode = RLHtmlParserBase.PROCESS_TIME_MODE) {
		if (!this.#timer) {
			return '00:00';
		}

		const calculateTimerInterval = (start) => {
				const sec = (Date.now() - start) / 1000;
				const result = sec > 59 ? (sec / 60).toFixed(2) : sec;
				return `${result} ${sec > 59 ? 'minutes' : 'seconds'}`;
		}

		switch (mode) {
			case RLHtmlParserBase.PROCESS_TIME_MODE:
				return `Parser was executed in ${calculateTimerInterval(this.#timer)}`;
			case RLHtmlParserBase.ITERATION_TIME_MODE:
				return calculateTimerInterval(Date.now());
		}
	}
}

module.exports = RLHtmlParserBase;