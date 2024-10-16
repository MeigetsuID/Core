import IOManager from '@meigetsuid/iomanager';
import AccountManager from './AccountManager';
import { v4 as uuidv4 } from 'uuid';

describe('Account Manager', () => {
    const Account = new AccountManager('appkey');
    const AppIO = new IOManager.Application();
    let AppID: string;
    beforeAll(async () => {
        await AppIO.CreateApp('4010404006753', {
            name: 'Test App',
            description: 'This is a test app',
            redirect_uri: ['https://test.meigetsu.jp/callback'],
            privacy_policy: 'https://test.meigetsu.jp/privacy',
            public: false,
        }).then(res => {
            if (!res) throw new Error('App Create Error');
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
            describe('Token Default Expire', () => {
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
            });
            describe('Token Reserved Expire', () => {
                describe('All', () => {
                    it('OpenID', async () => {
                        const Now = new Date();
                        Now.setMilliseconds(0);
                        const result = await Account.IssueToken(
                            {
                                id: '4010404006753',
                                app_id: AppID,
                                scopes: ['user.read', 'openid'],
                            },
                            Now,
                            {
                                access_token: 5,
                                refresh_token: 10,
                                id_token: 8,
                            }
                        );
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
                                refresh_token: new Date(Now.getTime() + 10 * 60000),
                                id_token: new Date(Now.getTime() + 8 * 60000),
                            },
                        });
                    });
                    it('No OpenID', async () => {
                        const Now = new Date();
                        Now.setMilliseconds(0);
                        const result = await Account.IssueToken(
                            { id: '4010404006753', app_id: AppID, scopes: ['user.read'] },
                            Now,
                            {
                                access_token: 5,
                                refresh_token: 10,
                            }
                        );
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
                                refresh_token: new Date(Now.getTime() + 10 * 60000),
                            },
                        });
                    });
                });
                describe('Only Access Token', () => {
                    it('OpenID', async () => {
                        const Now = new Date();
                        Now.setMilliseconds(0);
                        const result = await Account.IssueToken(
                            {
                                id: '4010404006753',
                                app_id: AppID,
                                scopes: ['user.read', 'openid'],
                            },
                            Now,
                            {
                                access_token: 5,
                            }
                        );
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
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
                            Now,
                            {
                                access_token: 5,
                            }
                        );
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
                                refresh_token: new Date(Now.getTime() + 10080 * 60000),
                            },
                        });
                    });
                });
                describe('Only Refresh Token', () => {
                    it('OpenID', async () => {
                        const Now = new Date();
                        Now.setMilliseconds(0);
                        const result = await Account.IssueToken(
                            {
                                id: '4010404006753',
                                app_id: AppID,
                                scopes: ['user.read', 'openid'],
                            },
                            Now,
                            {
                                refresh_token: 190,
                            }
                        );
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 180 * 60000),
                                refresh_token: new Date(Now.getTime() + 190 * 60000),
                                id_token: new Date(Now.getTime() + 480 * 60000),
                            },
                        });
                    });
                    it('No OpenID', async () => {
                        const Now = new Date();
                        Now.setMilliseconds(0);
                        const result = await Account.IssueToken(
                            { id: '4010404006753', app_id: AppID, scopes: ['user.read'] },
                            Now,
                            {
                                refresh_token: 190,
                            }
                        );
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 180 * 60000),
                                refresh_token: new Date(Now.getTime() + 190 * 60000),
                            },
                        });
                    });
                });
                it('Only ID Token', async () => {
                    const Now = new Date();
                    Now.setMilliseconds(0);
                    const result = await Account.IssueToken(
                        {
                            id: '4010404006753',
                            app_id: AppID,
                            scopes: ['user.read', 'openid'],
                        },
                        Now,
                        {
                            id_token: 8,
                        }
                    );
                    expect(result).toStrictEqual({
                        token_type: 'Bearer',
                        access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                        refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                        id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                        expires_at: {
                            access_token: new Date(Now.getTime() + 180 * 60000),
                            refresh_token: new Date(Now.getTime() + 10080 * 60000),
                            id_token: new Date(Now.getTime() + 8 * 60000),
                        },
                    });
                });
            });
            describe('Invalid', () => {
                it('System ID/Pattern Error', async () => {
                    await expect(() =>
                        Account.IssueToken({ id: '99999999', app_id: AppID, scopes: ['user.read'] })
                    ).rejects.toThrow('Invalid System ID');
                });
                it('System ID/Not Found', async () => {
                    await expect(() =>
                        Account.IssueToken({ id: '4010404006153', app_id: AppID, scopes: ['user.read'] })
                    ).rejects.toThrow('App ID or System ID is not found');
                });
                it('App ID/Pattern Error', async () => {
                    await expect(() =>
                        Account.IssueToken({ id: '4010404006753', app_id: 'invalidappid', scopes: ['user.read'] })
                    ).rejects.toThrow('Invalid App ID');
                });
                it('App ID/Not Found', async () => {
                    await expect(() =>
                        Account.IssueToken({
                            id: '4010404006753',
                            app_id: `app-${uuidv4().replace(/-/g, '')}`,
                            scopes: ['user.read'],
                        })
                    ).rejects.toThrow('App ID or System ID is not found');
                });
                it('Virtual ID/Pattern Error', async () => {
                    await expect(() =>
                        Account.IssueToken({ id: '4010404006753', scopes: ['user.read'] })
                    ).rejects.toThrow('Invalid Virtual ID');
                });
                it('Virtual ID/Not Found', async () => {
                    await expect(() =>
                        Account.IssueToken({ id: `vid-${uuidv4().replace(/-/g, '')}`, scopes: ['user.read'] })
                    ).rejects.toThrow('Invalid Virtual ID');
                });
            });
        });
        describe('Refresh Token', () => {
            describe('Token Default Expire', () => {
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
            });
            describe('Token Reserved Expire', () => {
                describe('All', () => {
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
                        const result = await Account.Refresh(TokenRecord.refresh_token, Now, {
                            access_token: 5,
                            refresh_token: 10,
                            id_token: 8,
                        });
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
                                refresh_token: new Date(Now.getTime() + 10 * 60000),
                                id_token: new Date(Now.getTime() + 8 * 60000),
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
                        const result = await Account.Refresh(TokenRecord.refresh_token, Now, {
                            access_token: 5,
                            refresh_token: 10,
                        });
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
                                refresh_token: new Date(Now.getTime() + 10 * 60000),
                            },
                        });
                    });
                });
                describe('Only Access Token', () => {
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
                        const result = await Account.Refresh(TokenRecord.refresh_token, Now, {
                            access_token: 5,
                        });
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
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
                        const result = await Account.Refresh(TokenRecord.refresh_token, Now, {
                            access_token: 5,
                        });
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 5 * 60000),
                                refresh_token: new Date(Now.getTime() + 10080 * 60000),
                            },
                        });
                    });
                });
                describe('Only Refresh Token', () => {
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
                        const result = await Account.Refresh(TokenRecord.refresh_token, Now, {
                            refresh_token: 10900,
                        });
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 180 * 60000),
                                refresh_token: new Date(Now.getTime() + 10900 * 60000),
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
                        const result = await Account.Refresh(TokenRecord.refresh_token, Now, {
                            refresh_token: 10900,
                        });
                        expect(result).toStrictEqual({
                            token_type: 'Bearer',
                            access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                            expires_at: {
                                access_token: new Date(Now.getTime() + 180 * 60000),
                                refresh_token: new Date(Now.getTime() + 10900 * 60000),
                            },
                        });
                    });
                });
                it('Only ID Token', async () => {
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
                    const result = await Account.Refresh(TokenRecord.refresh_token, Now, {
                        id_token: 500,
                    });
                    expect(result).toStrictEqual({
                        token_type: 'Bearer',
                        access_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                        refresh_token: expect.stringMatching(/^[a-zA-Z0-9]{256}$/),
                        id_token: expect.stringMatching(/^[a-zA-Z0-9._-]+$/),
                        expires_at: {
                            access_token: new Date(Now.getTime() + 180 * 60000),
                            refresh_token: new Date(Now.getTime() + 10080 * 60000),
                            id_token: new Date(Now.getTime() + 500 * 60000),
                        },
                    });
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
                    status: 200,
                    body: {
                        id: '4010404006753',
                        user_id: 'meigetsu2020',
                        name: '明月',
                        mailaddress: 'info@mail.meigetsu.jp',
                        account_type: 0,
                    },
                });
            });
            it('Invalid Access Token', async () => {
                const result = await Account.GetByAccessToken('invalidaccesstoken');
                expect(result).toStrictEqual({
                    status: 401,
                });
            });
        });
        describe('Get By User ID', () => {
            it('OK', async () => {
                const result = await Account.GetByUserID('meigetsu2020');
                expect(result).toStrictEqual({
                    status: 200,
                    body: {
                        user_id: 'meigetsu2020',
                        name: '明月',
                        account_type: 0,
                    },
                });
            });
            it('Not Found', async () => {
                const result = await Account.GetByUserID('notfound');
                expect(result).toStrictEqual({
                    status: 404,
                });
            });
        });
        describe('Update Account Record', () => {
            describe('No Contain Mail Address', () => {
                beforeAll(async () => {
                    await Account.CreateForce({
                        id: '4010404006754',
                        user_id: 'update_test',
                        name: 'Update Test',
                        mailaddress: 'update-test@mail.meigetsu.jp',
                        password: 'password01',
                        account_type: 2,
                    });
                    await Account.CreateForce({
                        id: '4010404006755',
                        user_id: 'update_test02',
                        name: 'Update Test 2',
                        mailaddress: 'update-test02@mail.meigetsu.jp',
                        password: 'password01',
                        account_type: 1,
                    });
                    await Account.CreateForce({
                        id: '4010404006756',
                        user_id: 'email_update01',
                        name: 'EMail Update Test 1',
                        mailaddress: 'update-test03@mail.meigetsu.jp',
                        password: 'password01',
                        account_type: 2,
                    });
                    await Account.CreateForce({
                        id: '4010404006757',
                        user_id: 'email_update02',
                        name: 'EMail Update Test 2',
                        mailaddress: 'update-test04@mail.meigetsu.jp',
                        password: 'password01',
                        account_type: 1,
                    });
                });
                it('OK', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006754',
                        app_id: AppID,
                        scopes: ['user.write'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        user_id: 'update_test01',
                        name: 'Update Test 1',
                    });
                    expect(result).toStrictEqual({ status: 200 });
                    expect(await Account.GetByUserID('update_test01')).toStrictEqual({
                        status: 200,
                        body: {
                            user_id: 'update_test01',
                            name: 'Update Test 1',
                            account_type: 2,
                        },
                    });
                });
                it('Invalid Access Token', async () => {
                    const result = await Account.Update('invalidaccesstoken', {
                        name: 'Update Test 2',
                    });
                    expect(result).toStrictEqual({ status: 401 });
                });
                it('Scope Error', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006754',
                        app_id: AppID,
                        scopes: ['user.read'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        user_id: 'update_test03',
                        name: 'Update Test 3',
                    });
                    expect(result).toStrictEqual({ status: 401 });
                });
                it('User ID Already Exists', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006754',
                        app_id: AppID,
                        scopes: ['user.write'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        user_id: 'meigetsu2020',
                        name: 'Update Test 4',
                    });
                    expect(result).toStrictEqual({ status: 400 });
                });
                it('Is Corp', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006755',
                        app_id: AppID,
                        scopes: ['user.write'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        user_id: 'update_test',
                        name: 'Update Test 5',
                    });
                    expect(result).toStrictEqual({ status: 404 });
                });
            });
            describe('Update Mail Address', () => {
                it('OK/Personal', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006756',
                        app_id: AppID,
                        scopes: ['user.read', 'user.write'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        mailaddress: 'new-email01@mail.meigetsu.jp',
                    });
                    expect(result).toStrictEqual({
                        status: 200,
                        body: {
                            id: expect.stringMatching(/^\d{8}$/),
                            expires_at: expect.any(Date),
                        },
                    });
                    if (!result.body) throw new Error('Result Body is not found');
                    const NextProcessResult = await Account.UpdateMailAddress(result.body.id);
                    expect(NextProcessResult).toStrictEqual({ status: 200 });
                    expect(await Account.GetByAccessToken(TokenRecord.access_token)).toStrictEqual({
                        status: 200,
                        body: {
                            id: '4010404006756',
                            user_id: 'email_update01',
                            name: 'EMail Update Test 1',
                            mailaddress: 'new-email01@mail.meigetsu.jp',
                            account_type: 2,
                        },
                    });
                });
                it('OK/Corp', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006757',
                        app_id: AppID,
                        scopes: ['user.read', 'user.write'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        mailaddress: 'new-email02@mail.meigetsu.jp',
                    });
                    expect(result).toStrictEqual({
                        status: 200,
                        body: {
                            id: expect.stringMatching(/^\d{8}$/),
                            expires_at: expect.any(Date),
                        },
                    });
                    if (!result.body) throw new Error('Result Body is not found');
                    const NextProcessResult = await Account.UpdateMailAddress(result.body.id);
                    expect(NextProcessResult).toStrictEqual({ status: 200 });
                    expect(await Account.GetByAccessToken(TokenRecord.access_token)).toStrictEqual({
                        status: 200,
                        body: {
                            id: '4010404006757',
                            user_id: 'email_update02',
                            name: 'EMail Update Test 2',
                            mailaddress: 'new-email02@mail.meigetsu.jp',
                            account_type: 1,
                        },
                    });
                });
                it('Invalid Access Token', async () => {
                    const result = await Account.Update('invalidaccesstoken', {
                        mailaddress: 'new-email03@mail.meigetsu.jp',
                    });
                    expect(result).toStrictEqual({ status: 401 });
                });
                it('Scope Error', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006756',
                        app_id: AppID,
                        scopes: ['user.read'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        mailaddress: 'new-email03@mail.meigetsu.jp',
                    });
                    expect(result).toStrictEqual({ status: 401 });
                });
                it('Mail Address Already Exists', async () => {
                    const TokenRecord = await Account.IssueToken({
                        id: '4010404006756',
                        app_id: AppID,
                        scopes: ['user.read', 'user.write'],
                    });
                    const result = await Account.Update(TokenRecord.access_token, {
                        mailaddress: 'info@mail.meigetsu.jp',
                    });
                    expect(result).toStrictEqual({ status: 400 });
                });
                it('Invalid Cache ID', async () => {
                    const result = await Account.UpdateMailAddress('99999999');
                    expect(result).toStrictEqual({ status: 404 });
                });
                it('Cache ID is for entry', async () => {
                    const PreEntryInfo = await Account.PreEntry('new-account01@mail.meigetsu.jp');
                    if (typeof PreEntryInfo.body === 'string') throw new Error(PreEntryInfo.body);
                    const result = await Account.UpdateMailAddress(PreEntryInfo.body.id);
                    expect(result).toStrictEqual({ status: 404 });
                });
            });
        });
        describe('Delete Account Record', () => {
            beforeAll(async () => {
                await Account.CreateForce({
                    id: '4010404006758',
                    user_id: 'delete_test01',
                    name: 'Delete Test 01',
                    mailaddress: 'deltest@mail.meigetsu.jp',
                    password: 'password01',
                    account_type: 3,
                });
            });
            it('OK', async () => {
                const result = await Account.Delete('4010404006758');
                expect(result).toStrictEqual({ status: 200 });
                expect(await Account.GetByUserID('delete_test01')).toStrictEqual({ status: 404 });
            });
            it('Invalid System ID', async () => {
                const result = await Account.Delete('4010404006759');
                expect(result).toStrictEqual({ status: 404 });
            });
        });
    });
});
