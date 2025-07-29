const Tag = require('./Tag.js');
const {InputDataError} = require("./Errors");

class Selector {
    static MODE_STARTS_WITH = '^';
    static MODE_ENDS_WITH = '$';
    static MODE_WORD_INCLUDES = '*';
    static MODE_LIST_INCLUDES = '~';
    static MODE_EXACTLY_OR_STARTS_WITH = '|';
    /**
     * For selectors that may be the target for parsed data
     * Selectors that maintained:
     * 	[tag#id, tag.class, tag#id.class.class, tag#id > tag.class, tag[attr($|^|*)=value]]
     *
     * @returns {RegExp} for selector that may used
     * @public
     */
    static getRegex() {
        return /[#\.\[>\s]+[\w-_="'\]\*\^\$\~\|\/]+/g;
    }

    static parseSelectorString(string) {
        const result = {};
        const regexArr = this.getRegex().exec(string);

        if (!string || typeof string !== 'string') {
            throw new InputDataError(`Bad selector: ${string}`);
        }

        let tagName, attrSlice;
        if (regexArr) {
            tagName = regexArr.input.substring(0, regexArr.index);
            attrSlice = regexArr.input.substring(regexArr.index);
        }
        else {
            tagName = string;
        }

        switch (attrSlice?.charAt(0)) {
            case '#':
                result.attribute = {
                    name: 'id',
                    value: attrSlice.slice(1)
                };
                break;

            case '.':
                result.attribute = {
                    name: 'class',
                    value: attrSlice.slice(1)
                }
                break;

            case '[':
                //item = '[href|=some]';
                const pair = attrSlice.slice(1, attrSlice.indexOf(']')).split('=');
                let attrName = pair[0];

                let mode = attrName.slice(-1).match(/\$|\*|\^|\~|\|/);
                attrName = mode ? attrName.slice(0, attrName.length-1) : attrName;

                result.attribute = {
                    name: attrName,
                    value: pair.length > 1 ? pair[1] : null,
                    handler: null
                };

                if (mode) {
                    switch (mode[0]) {
                        case this.MODE_STARTS_WITH:
                            result.attribute.handler = (item) => item.startsWith(result.attribute.value)
                            break;

                        case this.MODE_ENDS_WITH:
                            result.attribute.handler = (item) => item.endsWith(result.attribute.value);
                            break

                        case this.MODE_WORD_INCLUDES:
                            result.attribute.handler = (item) => item.includes(result.attribute.value);
                            break;

                        case this.MODE_LIST_INCLUDES:
                            result.attribute.handler = (item) => {
                                item.split(' ').forEach(word => {
                                    if (word === result.attribute.value) return true;
                                })

                                return false;
                            }
                            break;

                        case this.MODE_EXACTLY_OR_STARTS_WITH:
                            result.attribute.handler = (item) => item.startsWith(result.attribute.value)
                                || item === result.attribute.value;
                            break;

                        default:
                            result.attribute.handler = (item) => item === result.attribute.value;

                    }
                }
                else {
                    if (result.attribute.value) {
                        result.attribute.handler = (item) => item === result.attribute.value;
                    }
                }
                break;

            case '>':
                //tagStructure.child = item.slice(1);
                break;
            default:
                break;
        }

        return {
            tag: tagName,
            attribute: result.attribute ?? null
        }
    }
}

module.exports = Selector;