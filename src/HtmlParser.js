const RLHtmlParserBase = require('./RLHtmlParserBase');
const {InputDataError} = require('./Errors');
class HtmlParser extends RLHtmlParserBase {

    /**
     * Gets all attribute values of elements matches the passed selectors
     * @param {Object} selectors - target selectors to be parsed
     * @param {string[]|string} links - Array of urls or single url
     * @returns {Promise<Object[]>} All found element data matches the selectors
     *
     * @public
     */
    static async parse(selectors, links) {
        if (!Object.keys(selectors).length) {
            throw new InputDataError('Selectors not provided');
        }

        if (!links.length) {
           throw new InputDataError('Links not provided');
        }

        if(!Array.isArray(links)) {
            links = [links];
        }

        const parser = new HtmlParser();
        const result = {};

        for (let link of links) {
            if (await parser.goto(link)) {
                for (let prop in selectors) {
                    result[prop] = [
                        ...(result[prop] ?? []),
                        ...parser.parseSelector(selectors[prop]),
                    ];
                }
            }
        }

        return result;
    }

    /**
     * HtmlParse instance
     * @param {Object} selectors - Selectors to be found
     * @param {string[]} links - URL links to be parsed
     * @returns {HtmlParser}
     */
    constructor(selectors = {}, links = []) {
        super();
        this.selectors = selectors;
        this.links = links;
        return this;
    }

    /**
     * @param selectors
     * @returns {HtmlParser}
     */
    setSelectors(selectors) {
        this.selectors = selectors;
        return this;
    }

    /**
     * @param links
     * @returns {HtmlParser}
     */
    setLinks(links) {
        this.links = links;
        return this;
    }

    /**
     * Runs parser process and collect all found data
     * @param {string} attr - What attribute values to be returned
     * @returns {Promise<Object>}
     *
     * @private
     */
    async _run(attr) {
        if (!Object.keys(this.selectors).length || !this.links) {
            throw new Error('No data to parse');
        }

        this.startTimer();
        const result = {};

        for (let link of this.links) {
           if (await this.goto(link)) {
               for (let prop in this.selectors) {
                   result[prop] = [
                    ...(result[prop] ?? []),
                    ...this.parseElements(this.selectors[prop], attr)
                   ];
               }
           }
        }

        return this.prepareOutputData(result);
    }

    /**
     * Gets all values of tags which matches the selectors
     * @returns {Promise<Object>}
     *
     * @public
     */
    async values() {
        return await this._run('value');
    }

    /**
     * Gets all values of tag attribute which passed to param
     * @param attribute - Target tag attribute
     * @returns {Promise<Object>}
     *
     * @public
     */
    async attrValues(attribute) {
        return await this._run(attribute);
    }

    /**
     * Hook for preparing data to be return from the HtmlParser
     * @param {Object[]} data
     * @returns {*}
     *
     * @protected
     */
    prepareOutputData(data) {
        return data;
    }
}

module.exports = HtmlParser;