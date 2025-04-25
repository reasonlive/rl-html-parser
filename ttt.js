import HtmlParser from './src/HtmlParser.js';

const website = 'https://jestjs.io/docs/asynchronous';

(async () => {
    const tags = await HtmlParser.parse(website);
    const stringSelector = "a[href^=http]";

    const result = HtmlParser.find(stringSelector, tags)
    result.forEach(tag => console.log(tag.toString()))
})()

/*tags.forEach(tag => {
    console.log(tag.getAttributes())
})*/


//console.log(HtmlParser.find(stringSelector, tags));