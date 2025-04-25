const Request = require('../src/Request');
test("Test Request class", async () => {
    const website = 'https://jestjs.io/docs/asynchronous';

    const data = await Request.get(website);

    expect(Request.isHtml(data)).toBe(true);
    // expect(data).toBe(null);
})