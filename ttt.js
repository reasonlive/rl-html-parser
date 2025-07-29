import HtmlParser from './src/HtmlParser.js';

const website = 'https://www.youtube.com/watch?v=v_5oLM0DUuU';

(async () => {
    const tags = await HtmlParser.parse(website);
    const stringSelector = "yt-formatted-string";

    const result = HtmlParser.find(stringSelector, tags)
    result.forEach(tag => console.log(tag.toString()))
})()

/*tags.forEach(tag => {
    console.log(tag.getAttributes())
})*/


//console.log(HtmlParser.find(stringSelector, tags));