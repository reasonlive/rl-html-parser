const Selector = require('../src/Selector');
test("Parse selector strings", () => {
    let parsed = Selector.parseSelectorString('div#hello');
    expect(parsed.tag).toBe('div');
    expect(parsed.attribute.name).toBe('id');
    expect(parsed.attribute.value).toBe('hello');

    parsed = Selector.parseSelectorString("p.big__pick");
    expect(parsed.tag).toBe('p');
    expect(parsed.attribute.name).toBe('class');
    expect(parsed.attribute.value).toBe('big__pick');

    parsed = Selector.parseSelectorString('a[href^=http]');
    expect(parsed.tag).toBe('a');
    expect(parsed.attribute.name).toBe('href');
    expect(parsed.attribute.value).toBe('http');
    expect(parsed.attribute.handler('https://github.com')).toBe(true);

    parsed = Selector.parseSelectorString('a[href|=http]');
    expect(parsed.attribute.handler('https://github.com')).toBe(true);

    parsed = Selector.parseSelectorString('a[href$=http]');
    expect(parsed.attribute.handler('https://github.com')).toBe(false);

    parsed = Selector.parseSelectorString('a[href=http]');
    expect(parsed.attribute.handler('https://github.com')).toBe(false);
});