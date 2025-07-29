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
        //console.log(page.slice(page.length - 100, page.length));process.exit()
        if (Request.isHtml(page)) {
            const tags = Process
                .run(page)
                .map(string => Tag.fromString(string));
            //console.log(tags);process.exit()
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
        /* @return tag: tagName, attribute: {name, value, handler} */
        const parsedSelector = Selector.parseSelectorString(selector);
        //console.log(parsedSelector);process.exit()
        return tags.filter(tag => {
            if (parsedSelector.tag && parsedSelector.tag === tag.getName()) {
                // console.log(tag.getName());
                if (parsedSelector.attribute?.name) {
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