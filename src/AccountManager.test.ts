import IOManager from '@meigetsuid/iomanager';
import AccountManager from './AccountManager';

describe('Account Manager', () => {
    const Account = new AccountManager('appkey');
    const AppIO = new IOManager.Application();
    let AppID: string;
    beforeAll(async () => {
        await Account.CreateForce({
            id: '4010404006753',
            user_id: 'meigetsu2020',
            name: '明月',
            mailaddress: 'info@mail.meigetsu.jp',
            password: 'password01',
            account_type: 0,
        });
        await AppIO.CreateApp('4010404006753', {
            name: 'Test App',
            description: 'This is a test app',
            redirect_uri: ['https://test.meigetsu.jp/callback'],
            privacy_policy: 'https://test.meigetsu.jp/privacy',
            public: false,
        }).then(res => {
            AppID = res.client_id;
        });
    });
    describe('Use Time Mock', () => {
        const FakeTime = new Date();
        FakeTime.setMilliseconds(0);
        beforeAll(() => {
            jest.useFakeTimers({ now: FakeTime.getTime() });
        });
        afterAll(() => {
            jest.useRealTimers();
        });
        it('Pre Entry/OK', async () => {
            const result = await Account.PreEntry('pre-entry@mail.meigetsu.jp');
            expect(result).toStrictEqual({
                status: 201,
                body: {
                    id: expect.stringMatching(/^\d{8}$/),
                    expires_at: new Date(FakeTime.getTime() + 300000),
                },
            });
        });
        it('Pre Entry/NG', async () => {
            const result = await Account.PreEntry('info@mail.meigetsu.jp');
            expect(result).toStrictEqual({
                status: 400,
                body: 'このメールアドレスは既に使用されています',
            });
        });
    });
    describe('No Time Mock', () => {
        describe('Entry', () => {
            it('OK', async () => {
                const PreEntryInfo = await Account.PreEntry('entry-test01@mail.meigetsu.jp');
                if (typeof PreEntryInfo.body === 'string') throw new Error(PreEntryInfo.body);
                const result = await Account.Entry(PreEntryInfo.body.id, {
                    user_id: 'entry-test01',
                    name: 'Entry Test',
                    password: 'password01',
                });
                expect(result).toStrictEqual({ status: 201 });
                const resultAfter = await Account.Entry(PreEntryInfo.body.id, {
                    user_id: 'entry-test01',
                    name: 'Entry Test',
                    password: 'password01',
                });
                expect(resultAfter).toStrictEqual({ status: 404 });
            });
            it('Not Found', async () => {
                const result = await Account.Entry('99999999', {
                    user_id: 'entry-test02',
                    name: 'Entry Test',
                    password: 'password01',
                });
                expect(result).toStrictEqual({ status: 404 });
            });
            it('User ID Already Exists', async () => {
                const PreEntryInfo = await Account.PreEntry('entry-test03@mail.meigetsu.jp');
                if (typeof PreEntryInfo.body === 'string') throw new Error(PreEntryInfo.body);
                const result = await Account.Entry(PreEntryInfo.body.id, {
                    user_id: 'meigetsu2020',
                    name: 'Entry Test',
                    password: 'password01',
                });
                expect(result).toStrictEqual({ status: 400, body: 'このユーザーＩＤは使用できません' });
            });
            it('Corp Number Already Exists', async () => {
                const PreEntryInfo = await Account.PreEntry('entry-test04@mail.meigetsu.jp');
                if (typeof PreEntryInfo.body === 'string') throw new Error(PreEntryInfo.body);
                const result = await Account.Entry(PreEntryInfo.body.id, {
                    corp_number: '4010404006753',
                    user_id: 'entry-test04',
                    name: 'Entry Test',
                    password: 'password01',
                });
                expect(result).toStrictEqual({ status: 400, body: 'この法人のアカウントは既に登録されています。' });
            });
        });
        describe('Sign In', () => {
            it('With System ID', async () => {
                const result = await Account.SignIn('4010404006753', 'password01');
                expect(result).toBe('4010404006753');
            });
            it('With User ID', async () => {
                const result = await Account.SignIn('meigetsu2020', 'password01');
                expect(result).toBe('4010404006753');
            });
            it('With Mail Address', async () => {
                const result = await Account.SignIn('info@mail.meigetsu.jp', 'password01');
                expect(result).toBe('4010404006753');
            });
            it('System ID Not Found', async () => {
                const result = await Account.SignIn('99999999', 'password01');
                expect(result).toBeNull();
            });
            it('User ID Not Found', async () => {
                const result = await Account.SignIn('notfound', 'password01');
                expect(result).toBeNull();
            });
            it('Mail Address Not Found', async () => {
                const result = await Account.SignIn('notfound@mail.meigetsu.jp', 'password01');
                expect(result).toBeNull();
            });
            it('Wrong Password', async () => {
                const result = await Account.SignIn('4010404006753', 'wrongpassword');
                expect(result).toBeNull();
            });
        });
        describe('Create Token', () => {
            it('OpenID', async () => {
                const Now = new Date();
                Now.setMilliseconds(0);
                const result = await Account.IssueToken(
                    {
                        id: '4010404006753',
                        app_id: AppID,
                        scopes: ['user.read', 'openid'],
                    },
                    Now
                );
                expect(result).toStrictEqual({
                    token_type: 'Bearer',
                    access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                    expires_at: {
                        access_token: new Date(Now.getTime() + 180 * 60000),
                        refresh_token: new Date(Now.getTime() + 10080 * 60000),
                        id_token: new Date(Now.getTime() + 480 * 60000),
                    },
                });
            });
            it('No OpenID', async () => {
                const Now = new Date();
                Now.setMilliseconds(0);
                const result = await Account.IssueToken(
                    { id: '4010404006753', app_id: AppID, scopes: ['user.read'] },
                    Now
                );
                expect(result).toStrictEqual({
                    token_type: 'Bearer',
                    access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    expires_at: {
                        access_token: new Date(Now.getTime() + 180 * 60000),
                        refresh_token: new Date(Now.getTime() + 10080 * 60000),
                    },
                });
            });
            it('Invalid System ID', async () => {
                await expect(() =>
                    Account.IssueToken({ id: '99999999', app_id: AppID, scopes: ['user.read'] })
                ).rejects.toThrow('Invalid System ID');
            });
            it('Invalid App ID', async () => {
                await expect(() =>
                    Account.IssueToken({ id: '4010404006753', app_id: 'invalidappid', scopes: ['user.read'] })
                ).rejects.toThrow('Invalid App ID');
            });
            it('Invalid Virtual ID', async () => {
                await expect(() => Account.IssueToken({ id: '4010404006753', scopes: ['user.read'] })).rejects.toThrow(
                    'Invalid Virtual ID'
                );
            });
        });
        describe('Refresh Token', () => {
            it('OpenID', async () => {
                const Now = new Date();
                Now.setMilliseconds(0);
                const TokenRecord = await Account.IssueToken(
                    {
                        id: '4010404006753',
                        app_id: AppID,
                        scopes: ['user.read', 'openid'],
                    },
                    Now
                );
                const result = await Account.Refresh(TokenRecord.refresh_token, Now);
                expect(result).toStrictEqual({
                    token_type: 'Bearer',
                    access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                    expires_at: {
                        access_token: new Date(Now.getTime() + 180 * 60000),
                        refresh_token: new Date(Now.getTime() + 10080 * 60000),
                        id_token: new Date(Now.getTime() + 480 * 60000),
                    },
                });
            });
            it('No OpenID', async () => {
                const Now = new Date();
                Now.setMilliseconds(0);
                const TokenRecord = await Account.IssueToken(
                    {
                        id: '4010404006753',
                        app_id: AppID,
                        scopes: ['user.read'],
                    },
                    Now
                );
                const result = await Account.Refresh(TokenRecord.refresh_token);
                expect(result).toStrictEqual({
                    token_type: 'Bearer',
                    access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                    expires_at: {
                        access_token: new Date(Now.getTime() + 180 * 60000),
                        refresh_token: new Date(Now.getTime() + 10080 * 60000),
                    },
                });
            });
            it('Invalid Refresh Token', async () => {
                const result = await Account.Refresh('invalidrefreshtoken');
                expect(result).toBeNull();
            });
        });
        describe('Sign Out', () => {
            it('OK', async () => {
                const TokenRecord = await Account.IssueToken({
                    id: '4010404006753',
                    app_id: AppID,
                    scopes: ['user.read'],
                });
                const result = await Account.SignOut(TokenRecord.access_token);
                expect(result).toStrictEqual({ status: 200 });
            });
            it('Invalid Access Token', async () => {
                const result = await Account.SignOut('invalidaccesstoken');
                expect(result).toStrictEqual({ status: 404 });
            });
        });
        describe('Get By Access Token', () => {
            it('OK', async () => {
                const TokenRecord = await Account.IssueToken({
                    id: '4010404006753',
                    app_id: AppID,
                    scopes: ['user.read'],
                });
                const result = await Account.GetByAccessToken(TokenRecord.access_token);
                expect(result).toStrictEqual({
                    user_id: 'meigetsu2020',
                    name: '明月',
                    mailaddress: 'info@mail.meigetsu.jp',
                    account_type: 0,
                });
            });
            it('Invalid Access Token', async () => {
                const result = await Account.GetByAccessToken('invalidaccesstoken');
                expect(result).toBeNull();
            });
        });
    });
});
