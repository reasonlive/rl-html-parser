const Tag = require('../src/Tag');

test("Test Tag class", async () => {
    expect(Tag.isSingle('meta')).toBe(true);
    expect(Tag.isNested('div')).toBe(true);
    expect(Tag.isWrapper('body')).toBe(true);

    expect(Tag.countTagInString(
        'div',
        "hello <div> world </div> and <div> goodbye </div>"
    )).toBe(2);

    expect(Tag.hasNestedTagInString('div', '<div> hello <div>world</div></div>')).toBe(true);
})