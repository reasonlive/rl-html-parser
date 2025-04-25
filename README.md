# rl-html-parser
### Node.js module for parsing HTML pages

## Installing
```
npm install rl-html-parser
```
## Usage examples
#### Use of Class statically
```js
import HtmlParser from 'rl-html-parser';

// selectors you need to be found on the pages
// examples: div#id, div.class, div#id.class.class, div[attr=value]
const selector = 'a[href^=http]';
const link = 'https://github.com';
(async () => {
    // but in this case you will get all the data about the tag, including its attributes and values 
    const tags = await HtmlParser.parse(link);
    const filteredTagsBySelector = HtmlParser.find(selector, tags); // Tag[]
})()
```


