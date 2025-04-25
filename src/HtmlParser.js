const {InputDataError} = require('./Errors');
const Request = require('./Request');
const Process = require('./Process');
const Tag = require('./Tag');
const Selector = require('./Selector');
class HtmlParser {
    /**
     * Parse webpage into Tag objects
     * @param {string} link
     * @param {string} selector
     * @returns {Promise<Tag[]>}
     */
    static async parse(link, selector = '') {
        const page = await Request.get(link);
        if (Request.isHtml(page)) {
            const tags = Process
                .run(page)
                .map(string => Tag.fromString(string));

            if (selector) {
                return this.find(selector, tags);
            }
            else {
                return tags;
            }
        }

        return [];
    }

    /**
     * Find all tags by selector string
     * @param {string} selector
     * @param {Tag[]} tags
     * @returns Tag[]
     */
    static find(selector, tags) {
        // attribute: {name, value, handler}
        // tag: tagName
        const parsedSelector = Selector.parseSelectorString(selector);

        return tags.filter(tag => {
            if (parsedSelector.tag && parsedSelector.tag === tag.getName()) {
                if (parsedSelector.attribute.name) {
                    if (parsedSelector.attribute.value && tag.getAttribute(parsedSelector.attribute.name)) {
                        return parsedSelector.attribute.handler(tag.getAttribute(parsedSelector.attribute.name));
                    }
                    else {
                        return !!tag.getAttribute(parsedSelector.attribute.name);
                    }
                }
                else {
                    return parsedSelector.tag === tag.getName();
                }
            }

            return false;
        })
    }
}

module.exports = HtmlParser;