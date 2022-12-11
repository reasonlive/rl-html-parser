# rl-html-parser
### Node.js module for parsing HTML pages

## Installing
```
npm install rl-html-parser
```
## Usage examples
#### Use of Class instance
```js
import HtmlParser from 'rl-html-parser';

// selectors you need to be found on the pages
const selectors = {
    // examples: div#id, div.class, div#id.class.class, div[attr=value], div > p, etc.
    // For now it can only be one level of tag nesting (parent > child)
    links: 'div[href^=http]' // note: attribute value must be without quotes
};

// array of pages where selectors to be found
const pages = ['https://github.com'];

const parser = new HtmlParser(selectors, pages);

// if you only need values of an element matches the selector
// values as inner html inside the tag of an element
parser.values()
    .then(result => console.log(result.links))
    .catch(error => cosole.log(error));

// if you need values of specific attribute
parser.attrValues('href')
    .then(result => console.log(result.links))
    .catch(error => console.log(error));

// then you can change params for a search
parser
    .setSelectors({titles: 'h2 > span#History.mw-headline'})
    .setLinks(['https://en.wikipedia.org/wiki/HTML'])
    .attrValues('id')
    .then(result => console.log(result.titles)) // [History]
    .catch(error => console.log(error));
```

#### Static use
If we want to do a fast and simple request for target data, we may use a static method:
```js
(async () => {
    // but in this case you will get all the data about the tag, including its attributes and values 
    const data = await HtmlParser.parse({links: 'div[href^=http]'}, 'https://github.com');
    console.log(data[0].id);
    console.log(data[0].class);
    console.log(data[0].tagName);
    console.log(data[0].href)
    console.log(data[0].value); // inner html inside the tag
})()
```


