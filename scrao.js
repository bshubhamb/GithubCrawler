const puppeteer = require('puppeteer');
const creds = require('./creds');
const mongoose = require('mongoose');
const User = require('./models/users');



async function getNumPages(page) {
    const num_users_selector = '#js-pjax-container > div > div.col-12.col-md-9.float-left.px-2.pt-3.pt-md-0.codesearch-results > div > div.d-flex.flex-column.flex-md-row.flex-justify-between.border-bottom.pb-3.position-relative > h3';

    let inner = await page.evaluate((sel) =>{
        let html = document.querySelector(sel).innerHTML;

        return html.replace(',','').replace('users','').trim();
    },num_users_selector);

    let numUsers = parseInt(inner);


    return Math.ceil(numUsers / 10);
}

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto('https://github.com/login');

    const username_selector = '#login_field';
    const password_selector = '#password';
    const button_selector = '#login > form > div.auth-form-body.mt-3 > input.btn.btn-primary.btn-block';

    await page.click(username_selector);
    await page.keyboard.type(creds.username);

    await page.click(password_selector);
    await page.keyboard.type(creds.password);

    await page.click(button_selector);



    const userToSearch = 'shubham';
    const searchUrl = `https://github.com/search?q=${userToSearch}&type=Users`;

    await page.goto(searchUrl);


    const list_username_selector = '#user_search_results > div.user-list > div:nth-child(INDEX) > div.d-flex.flex-auto > div > a ';

    const list_email_selector = '#user_search_results > div.user-list > div:nth-child(INDEX) > div.d-flex.flex-auto > div > ul > li:nth-child(2) > a';
    const length_selector_class = 'user-list-item';


    let numPages = await getNumPages(page);
    console.log('numPages' , numPages);

    for(let h=1; h<= numPages;h++) {

        let pageUrl = searchUrl + '&p='+h;
        await page.goto(pageUrl);


        let listLength = await page.evaluate((sel)=>{
            return document.getElementsByClassName(sel).length;
        }, length_selector_class);

        for (let i = 1; i <= listLength; i++) {
            let usernameSelector = list_username_selector.replace("INDEX", i);
            let emailSelector = list_email_selector.replace('INDEX', i);

            let username = await page.evaluate((sel) => {
                return document.querySelector(sel).getAttribute('href').replace('/', '');
            }, usernameSelector);


            let email = await page.evaluate((sel) => {
                let element = document.querySelector(sel);
                return element ? element.innerHTML : null;
            }, emailSelector);


            if (!email) {
                continue
            }

            console.log(username, ' -> ', email);

            //Save in DB
            upsertUser({
                username:username,
                email: email,
                dateCrawled: new Date()
            })
        }
    }

    await browser.close();
})();


function upsertUser(userObj) {
    const DB_URL = 'mongodb://localhost/Scraping';

    if (mongoose.connection.readyState == 0) {
        mongoose.connect(DB_URL)
    }
    ;

    let conditions = {email: userObj.email};
    let options = {upsert: true, new: true, setDefaultsOnInsert: true};

    User.findOneAndUpdate(conditions, userObj, options);
}