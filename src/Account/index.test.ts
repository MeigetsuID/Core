import request from 'supertest';
import { readFile } from 'nodeeasyfileio';
import CorpProfileGenerator from '@meigetsuid/corpprofilegen';
import Account from '.';
import AccountManager from './AccountManager';
import { existsSync } from 'node:fs';
import ApplicationManager from '../Application/ApplicationManager';

global.fetch = jest.fn((url, options) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : '';
    // 国税庁法人番号検索ＡＰＩ
    if (urlString.includes('nta.go.jp')) {
        const query = new URL(urlString).searchParams.get('number');
        if (query == null) return Promise.reject('no query');
        const xml = existsSync('./testdata/nta.go.jp/' + query + '.xml')
            ? readFile('./testdata/nta.go.jp/' + query + '.xml')
            : readFile('./testdata/nta.go.jp/notfound.xml');
        return Promise.resolve(
            new Response(xml, {
                status: 200,
                headers: {
                    'Content-Type': 'application/xml',
                },
            })
        );
    }
    // Meigetsu Working Total Assistant System API
    else if (urlString.includes('localhost:7900')) {
        if (options == null) return Promise.reject('no options');
        switch (options.method) {
            case 'POST':
                return Promise.resolve(new Response());
            default:
                return Promise.reject('no method');
        }
    }
    return Promise.reject('unsupported url');
});

describe('Account API Test', () => {
    describe('Mock Check', () => {
        describe('NTA', () => {
            const CPG = new CorpProfileGenerator('dummy');
            it('NTA API 1', async () => {
                const res = await CPG.Create({
                    corp_number: '4010404006753',
                    user_id: 'meigetsu2020',
                    mailaddress: 'info@mail.meigetsu.jp',
                    password: 'password01',
                });
                expect(res).toStrictEqual({
                    id: '4010404006753',
                    user_id: 'meigetsu2020',
                    name: '明月',
                    mailaddress: 'info@mail.meigetsu.jp',
                    password: 'password01',
                    account_type: 3,
                });
            });
            it('NTA API 2', async () => {
                const res = await CPG.GetNewestName('1000011000005');
                expect(res).toBe('国立国会図書館');
            });
        });
    });
    describe('Main Test', () => {
        const AccountAPI = new Account('dummy');
        const AccountMgr = new AccountManager('dummy');
        const AppMgr = new ApplicationManager();
        describe('Entry Flow', () => {
            it('Personal OK', async () => {
                const preEntryRes = await request(AccountAPI.App)
                    .post('/')
                    .set('Content-Type', 'text/plain')
                    .send('kamioda@mail.meigetsu.jp');
                expect(preEntryRes.status).toBe(201);
                if (!process.env.RUNNING_MODE || process.env.RUNNING_MODE.toUpperCase() !== 'DEBUG') return;
                expect(preEntryRes.body).toStrictEqual({
                    id: expect.stringMatching(/^\d{8}$/),
                    expires_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
                });
                const entryRes = await request(AccountAPI.App)
                    .post('/' + preEntryRes.body.id)
                    .set('Content-Type', 'application/json')
                    .send({
                        name: 'Kamioda',
                        user_id: 'kamioda2022',
                        password: 'password01',
                    });
                expect(entryRes.status).toBe(201);
            });
            it('Corp OK', async () => {
                const preEntryRes = await request(AccountAPI.App)
                    .post('/')
                    .set('Content-Type', 'text/plain')
                    .send('info@ndl.go.jp');
                expect(preEntryRes.status).toBe(201);
                if (!process.env.RUNNING_MODE || process.env.RUNNING_MODE.toUpperCase() !== 'DEBUG') return;
                expect(preEntryRes.body).toStrictEqual({
                    id: expect.stringMatching(/^\d{8}$/),
                    expires_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
                });
                const entryRes = await request(AccountAPI.App)
                    .post('/' + preEntryRes.body.id)
                    .set('Content-Type', 'application/json')
                    .send({
                        corp_number: '1000011000005',
                        user_id: 'kokkai_toshokan',
                        password: 'password01',
                    });
                expect(entryRes.status).toBe(201);
            });
            it('Mail Address Pattern Error', async () => {
                const res = await request(AccountAPI.App)
                    .post('/')
                    .set('Content-Type', 'text/plain')
                    .send('jane.doe@domain-.com');
                expect(res.status).toBe(400);
            });
            it('Already used mail address', async () => {
                const res = await request(AccountAPI.App)
                    .post('/')
                    .set('Content-Type', 'text/plain')
                    .send('info@mail.meigetsu.jp');
                expect(res.status).toBe(400);
            });
            it('Corp Number Error', async () => {
                const preEntryRes = await request(AccountAPI.App)
                    .post('/')
                    .set('Content-Type', 'text/plain')
                    .send('info2@mail.meigetsu.jp');
                expect(preEntryRes.status).toBe(201);
                const entryRes = await request(AccountAPI.App)
                    .post('/' + preEntryRes.body.id)
                    .set('Content-Type', 'application/json')
                    .send({
                        corp_number: '1010404006753',
                        user_id: 'meigetsu2022',
                        password: 'password01',
                    });
                expect(entryRes.status).toBe(404);
            });
            it('Personal Object Error', async () => {
                const preEntryRes = await request(AccountAPI.App)
                    .post('/')
                    .set('Content-Type', 'text/plain')
                    .send('info3@mail.meigetsu.jp');
                expect(preEntryRes.status).toBe(201);
                const entryRes = await request(AccountAPI.App)
                    .post('/' + preEntryRes.body.id)
                    .set('Content-Type', 'application/json')
                    .send({
                        user_id: 'meigetsu2022',
                        password: 'password01',
                    });
                expect(entryRes.status).toBe(400);
            });
            it('Corp Object Error', async () => {
                const preEntryRes = await request(AccountAPI.App)
                    .post('/')
                    .set('Content-Type', 'text/plain')
                    .send('info4@mail.meigetsu.jp');
                expect(preEntryRes.status).toBe(201);
                const entryRes = await request(AccountAPI.App)
                    .post('/' + preEntryRes.body.id)
                    .set('Content-Type', 'application/json')
                    .send({
                        user_id: 'meigetsu2022',
                        password: 'password01',
                    });
                expect(entryRes.status).toBe(400);
            });
        });
        describe('Get Account By User ID', () => {
            it('OK', async () => {
                const res = await request(AccountAPI.App).get('/meigetsu2020');
                expect(res.status).toBe(200);
                expect(res.body).toStrictEqual({
                    user_id: 'meigetsu2020',
                    name: '明月',
                    account_type: 0,
                });
            });
            it('Not Found', async () => {
                const res = await request(AccountAPI.App).get('/notfound');
                expect(res.status).toBe(404);
            });
        });
        describe('Get Account By Access Token', () => {
            const AppInfo = {
                client_id: '',
                client_secret: '',
            };
            beforeAll(async () => {
                const CreatedAppInfo = await AppMgr.Create('4010404006753', {
                    name: 'Account Get Test App',
                    redirect_uri: ['https://idportal.meigetsu.jp/callback'],
                    privacy_policy: 'https://www.meigetsu.jp/privacy.html',
                    public: false,
                });
                if (!CreatedAppInfo || !CreatedAppInfo.client_secret) throw new Error('Failed to create confidential app');
                AppInfo.client_id = CreatedAppInfo.client_id;
                AppInfo.client_secret = CreatedAppInfo.client_secret;
            });
            it('OK', async () => {
                const TokenRecord = await AccountMgr.IssueToken({
                    id: '4010404006753',
                    app_id: AppInfo.client_id,
                    scopes: ['supervisor'],
                });
                const result = await request(AccountAPI.App)
                    .get('/')
                    .set('Authorization', 'Bearer ' + TokenRecord.access_token)
                    .send();
                expect(result.status).toBe(200);
                expect(result.body).toStrictEqual({
                    id: '4010404006753',
                    user_id: 'meigetsu2020',
                    name: '明月',
                    mailaddress: 'info@mail.meigetsu.jp',
                    account_type: 0,
                });
            });
            it('Invalid Token', async () => {
                const result = await request(AccountAPI.App)
                    .get('/')
                    .set('Authorization', 'Bearer invalidtoken')
                    .send();
                expect(result.status).toBe(401);
            });
            it('No Token', async () => {
                const result = await request(AccountAPI.App).get('/').send();
                expect(result.status).toBe(401);
            });
            it('Basic Auth', async () => {
                const result = await request(AccountAPI.App)
                    .get('/')
                    .set('Authorization', 'Basic NDAxMDQwNDAwNjc1MzpwYXNzd29yZDAx')
                    .send();
                expect(result.status).toBe(401);
            });
        });
    });
});
