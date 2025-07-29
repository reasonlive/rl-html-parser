const Tag = require('./Tag');
class Process {

    static #stringBuffer = []; // first raw data
    static #nestedStringBuffer = []; // exploded strings from stringBuffer
    static #resultStrings = []; // prepared tags as a strings
    static #chunk = []; // tmp

    /**
     * Get transformed tag strings
     * @param page
     * @returns {*[]}
     */
    static run(page) {
        this.parse(page);
        this.parseNested();
        this.#stringBuffer = this.#nestedStringBuffer = this.#chunk = [];
        return this.#resultStrings;
    }

    /**
     * Process of parsing the whole html page string
     * @param {string} page - Html string to be parsed
     * @param {boolean} strict - strict parsing with counting opened and closed tags
     * @public
     */
    static parse(page, strict = true) {
        let found = false;
        let opened = false;
        let tag = null;

        for (let i = 0; i < page.length; i++) {
            if (page[i] === '\n') {
                continue;
            }

            if (!found && page[i] === '<') {
                found = true;
            }

            if (found) {
                let char = page[i];
                this.#chunk.push(char);

                if ((tag == null) && (char === ' ' || char === '>')) {
                    tag = this.#chunk.join('').slice(1, -1);
                    if (!Tag.isSingle(tag) && !Tag.isWrapper(tag)) {
                        opened = true;
                    }
                }

                if (char === '>') {
                    let str = this.#chunk.join('');

                    if (
                        (Tag.isSingle(tag) || Tag.isWrapper(tag) && !opened || tag?.includes('/'))
                        || opened
                    ) {

                        if (strict) {
                            if (
                                Tag.isNested(tag)
                                && Tag.countTagInString(tag, str, Tag.OPENED) !== Tag.countTagInString(tag, str, Tag.CLOSED)
                            ) {
                                continue;
                            }
                        }
                        else {
                            if (Tag.isNested(tag) && !Tag.foundInString(tag, str)) {
                                continue;
                            }
                        }

                        if (opened && !Tag.foundInString(tag, str) && !tag.includes('/')) {
                            continue;
                        }

                        this.#stringBuffer.push(str);
                        found = opened = false;
                        this.#chunk = [];
                        tag = null;
                    }
                    else {
                        opened = true;
                    }
                }
            }
        }

        //console.log(this.#stringBuffer);process.exit()
    }

    static parseNested() {
        if (!this.#stringBuffer.length) {
            throw new Error("Buffer is empty");
        }

        for (let i = 0; i < this.#stringBuffer.length; i++) {
            if (this.#stringBuffer[i].startsWith('</')) {
                continue;
            }

            let tag = /\w+/imsu.exec(this.#stringBuffer[i].slice(0, 10));

            if (tag) {
                if (Tag.isNested(tag[0])) {
                    // magic is going here
                    this.#nestedStringBuffer = this.#extractNestedTags(this.#stringBuffer[i]);
                    this.#resultStrings = this.#resultStrings.concat(this.#nestedStringBuffer);
                }
                else {
                    this.#resultStrings.push(this.#stringBuffer[i]);
                }
            }
        }
    }

    static #explodeNestedString(nestedString, index = 0) {
        if (index === -1) {
            return null;
        }

        let chunk = '';
        let lastIndex = -1;

        if (nestedString.startsWith('<', index)) {
            chunk += '<';

            for (let i = index + 1; i < nestedString.length; i++) {
                if (nestedString[i] !== '<') {
                    chunk += nestedString[i];
                }
                else {
                    lastIndex = i;
                    this.#nestedStringBuffer.push(chunk);
                    break;
                }
            }
        }

        this.#explodeNestedString(nestedString, lastIndex);
    }

    static #extractNestedTags(nestedString) {
        this.#explodeNestedString(nestedString);
        return this.#nestedStringBuffer
            .filter(elem => elem.startsWith('<') && !elem.startsWith('</'))
            .map(elem => {
                const regexResult = /\w+/gimsu.exec(elem);
                return regexResult ? elem += `</${regexResult[0]}>` : elem;
            })
    }
}

module.exports = Process;