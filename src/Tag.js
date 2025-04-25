class Tag {

    #name;
    #value = '';
    #attributes = {};

    static OPENED = '<';
    static CLOSED = '>';


    constructor(tagName) {
        this.#name = tagName;
    }

    getName() {
        return this.#name;
    }

    setValue(value) {
        this.#value = value;
        return this;
    }

    getValue() {
        return this.#value ?? null;
    }

    setAttributes(attrs) {
        this.#attributes = attrs;
        return this;
    }

    getAttributes() {
        return this.#attributes;
    }

    getAttribute(attr) {
        return this.#attributes[attr] ?? null;
    }

    toString() {
        return this.getName() + " " + this.getValue() + " " + this.getAttributes().toString()
    }

    /**
     * Gets html tag string and turn it into object
     * @param tagStr - string from opened to closed tag
     * @returns {Tag}
     *
     * @public
     */
    static fromString(tagStr) {
        const attrs = {}; // all attributes of the target tag
        const index = tagStr.search(/>|\s/);
        const tag = tagStr.slice(1, index);

        for (let pair of tagStr.matchAll(/(\w+)=["|'](.*?)["|']/gi)) {
            const [,attr, attrValue] = pair;
            attrs[attr.trim()] = attrValue.replace(/"/g, '').trim();
        }

        let val = tagStr.slice(
            tagStr.indexOf('>') + 1,
            tagStr.lastIndexOf('</')
        );

        if(
            (val.indexOf(`<${tag}`) !== -1)
            && val.indexOf(`</${tag}>`) === -1
        ) {
            let tagsAmount = val.match(new RegExp(`<${tag}\\b`, 'gi')).length;
            val += `</${tag}>`.repeat(tagsAmount);
        }

        return new this(tag).setValue(val).setAttributes(attrs);
    }

    /**
     * Tags which may have the same tags inside
     * @type {boolean}
     *
     * @public
     */
    static isNested(tagName) {
        return ['div', 'span', 'p', 'button', 'li']
            .includes(tagName.toLowerCase());
    }

    /**
     * Tags doesn't have closing tag
     * @type {boolean}
     *
     * @public
     */
    static isSingle(tagName) {
        return ['link', 'meta', 'img', '!doctype']
            .includes(tagName.toLowerCase());
    }

    /**
     * Tags which may not have any values and attributes
     * @type {boolean}
     *
     * @public
     */
    static isWrapper(tagName) {
        return [
            'html',
            'head',
            'body',
            'section',
            'ul',
            'ol',
            'header',
            'footer',
            'nav',
            'aside',
            'main',
            'article',
        ].includes(tagName.toLowerCase());
    }

    static isChar(tagName) {
        return ['a', 'b', 'p']
            .includes(tagName.toLowerCase());
    }

    /**
     * Gets regular expression for DOM element from opened to closed tag
     * @param {string} tagName - Target tag name
     * @param {string} flags - Flags for RegExp instance
     * @returns {RegExp}
     *
     * @public
     */
    static getRegex(tagName, flags = 'gimsu') {
        let str = `<${tagName}[\\b]*.*?`;

        if (Tag.isSingle(tagName)) {
            str += `\/?>`;
        }
        else {
            str += `>(.*?)<\/${tagName}>`;
        }

        return new RegExp(str, flags);
    }

    static foundInString(tagName, string) {
        return Tag.getRegex(tagName).exec(string) !== null;
    }

    static hasNestedTagInString(tag, string) {
        if (Tag.isNested(tag)) {
            const openedRegexp = new RegExp(
                Tag.OPENED + tag, 'gimsu'
            );

            let amount = 0;
            while(openedRegexp.exec(string) !== null) {
                amount++;
            }

            return amount > 1;
        }

        return false;
    }

    /**
     * Counts amount of found tag in a string
     * @param tag
     * @param string
     * @param tagType Tag.* constants
     * @returns {number}
     */
    static countTagInString(tag, string, tagType = Tag.OPENED) {
        let regexp = tagType === Tag.OPENED
            ? new RegExp(`<${tag}`, 'gimsu')
            : new RegExp(`</${tag}>`, 'gimsu');

        let amount = 0;
        while(regexp.exec(string) !== null) {
            amount++;
        }

        return amount;
    }
}

module.exports = Tag;