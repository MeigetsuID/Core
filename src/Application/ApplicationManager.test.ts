/* eslint-disable jest/no-commented-out-tests */
import ApplicationManager from './ApplicationManager';
import AccountManager from '../Account/AccountManager';
import { AppIDPattern } from '../Pattern';
const DeveloperID = '4010404006753';

describe('Application Manager', () => {
    const AppMgr = new ApplicationManager();
    const AccountMgr = new AccountManager('');
    describe('Create', () => {
        it('Public', async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            expect(result).toStrictEqual({
                client_id: expect.stringMatching(AppIDPattern),
            });
        });
        it('Confidential', async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: false,
            });
            expect(result).toStrictEqual({
                client_id: expect.stringMatching(AppIDPattern),
                client_secret: expect.stringMatching(/^[0-9a-zA-Z]{64}$/),
            });
        });
        it('Invalid Developer ID', async () => {
            const result = await AppMgr.Create('0', {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            expect(result).toBeNull();
        });
    });
    describe('Get', () => {
        const GeneratedApp = {
            client_id: '',
        };
        beforeAll(async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            if (!result) throw new Error('Failed to create app');
            GeneratedApp.client_id = result.client_id;
        });
        it('OK', async () => {
            const result = await AppMgr.Get(GeneratedApp.client_id);
            expect(result).toStrictEqual({
                client_id: GeneratedApp.client_id,
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                developer: '明月',
            });
        });
        it('Not Found', async () => {
            const result = await AppMgr.Get('app-notfound');
            expect(result).toBeNull();
        });
    });
    describe('GetAll', () => {
        const AccountMgr = new AccountManager('');
        const DeveloperIDForThisTest = '3010404006753';
        const DeveloperIDForNotFoundTest = '3010404006754';
        const GeneratedAppClientIDs: string[] = [];
        beforeAll(async () => {
            await AccountMgr.CreateForce({
                id: DeveloperIDForThisTest,
                user_id: 'app_get_all_test',
                name: 'developer_name',
                mailaddress: 'app-get-all-test@mail.meigetsu.jp',
                password: 'password01',
                account_type: 0,
            });
            await AccountMgr.CreateForce({
                id: DeveloperIDForNotFoundTest,
                user_id: 'getall_notfound',
                name: 'developer_name',
                mailaddress: 'getall-notfound@mail.meigetsu.jp',
                password: 'password01',
                account_type: 0,
            });
            const AppCreateResult = await Promise.all(
                [...Array(10)].map(() =>
                    AppMgr.Create(DeveloperIDForThisTest, {
                        name: 'name',
                        description: 'description',
                        redirect_uri: ['https://example.com/callback'],
                        privacy_policy: 'https://example.com/privacy',
                        terms_of_service: 'https://example.com/tos',
                        public: true,
                    })
                )
            ).then(r => r.filter((r): r is { client_id: string } => r !== null));
            GeneratedAppClientIDs.push(...AppCreateResult.map(r => r.client_id).sort());
        });
        it('OK', async () => {
            const result = await AppMgr.GetAll(DeveloperIDForThisTest);
            expect(result).toStrictEqual(
                GeneratedAppClientIDs.map(client_id => ({
                    client_id: client_id,
                    name: 'name',
                    description: 'description',
                    redirect_uri: ['https://example.com/callback'],
                    privacy_policy: 'https://example.com/privacy',
                    terms_of_service: 'https://example.com/tos',
                    developer: 'developer_name',
                })).sort()
            );
        });
        it('Not Found', async () => {
            const result = await AppMgr.GetAll(DeveloperIDForNotFoundTest);
            expect(result).toStrictEqual([]);
        });
    });
    describe('Update', () => {
        const GeneratedApp = {
            no_update_secret: {
                client_id: '',
                client_secret: '',
            },
            update_secret: {
                client_id: '',
                client_secret: '',
            },
        };
        beforeAll(async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: false,
            });
            if (!result) throw new Error('Failed to create app');
            GeneratedApp.no_update_secret.client_id = result.client_id;
            GeneratedApp.no_update_secret.client_secret = result.client_secret || '';
            const result2 = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: false,
            });
            if (!result2) throw new Error('Failed to create app');
            GeneratedApp.update_secret.client_id = result2.client_id;
            GeneratedApp.update_secret.client_secret = result2.client_secret || '';
        });
        it('Client Secret No Regenerate', async () => {
            const result = await AppMgr.Update(GeneratedApp.no_update_secret.client_id, {
                name: 'new name',
                description: 'new description',
                regenerate_secret: false,
            });
            expect(result).toStrictEqual({
                client_id: GeneratedApp.no_update_secret.client_id,
            });
            const updated = await AppMgr.Get(GeneratedApp.no_update_secret.client_id);
            expect(updated).toStrictEqual({
                client_id: GeneratedApp.no_update_secret.client_id,
                name: 'new name',
                description: 'new description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                developer: '明月',
            });
        });
        it('Client Secret Regenerate', async () => {
            const result = await AppMgr.Update(GeneratedApp.update_secret.client_id, {
                redirect_uri: ['https://example.com/new_callback'],
                privacy_policy: 'https://example.com/new_privacy',
                terms_of_service: 'https://example.com/new_tos',
                regenerate_secret: true,
            });
            expect(result).toStrictEqual({
                client_id: GeneratedApp.update_secret.client_id,
                client_secret: expect.stringMatching(/^[0-9a-zA-Z]{64}$/),
            });
            const updated = await AppMgr.Get(GeneratedApp.update_secret.client_id);
            expect(updated).toStrictEqual({
                client_id: GeneratedApp.update_secret.client_id,
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/new_callback'],
                privacy_policy: 'https://example.com/new_privacy',
                terms_of_service: 'https://example.com/new_tos',
                developer: '明月',
            });
        });
        it('Not Found', async () => {
            const result = await AppMgr.Update('app-notfound', {
                name: 'new name',
                description: 'new description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                regenerate_secret: false,
            });
            expect(result).toBeNull();
        });
    });
    describe('Delete', () => {
        const GeneratedApp = {
            client_id: '',
        };
        beforeAll(async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            if (!result) throw new Error('Failed to create app');
            GeneratedApp.client_id = result.client_id;
        });
        it('OK', async () => {
            const result = await AppMgr.Delete(GeneratedApp.client_id);
            expect(result).toBe(true);
            const deleted = await AppMgr.Get(GeneratedApp.client_id);
            expect(deleted).toBeNull();
        });
        it('Not Found', async () => {
            const result = await AppMgr.Delete('app-notfound');
            expect(result).toBe(false);
        });
    });
    describe('DeleteAll', () => {
        const DeveloperIDForThisTest = '3010404006755';
        const DeveloperIDForNotFoundTest = '3010404006756';
        const GeneratedAppClientIDs: string[] = [];
        beforeAll(async () => {
            await AccountMgr.CreateForce({
                id: DeveloperIDForThisTest,
                user_id: 'app_delete_all_test',
                name: 'developer_name',
                mailaddress: 'app-delete-all-test@mail.meigetsu.jp',
                password: 'password01',
                account_type: 0,
            });
            await AccountMgr.CreateForce({
                id: DeveloperIDForNotFoundTest,
                user_id: 'deleteall_notfound',
                name: 'developer_name',
                mailaddress: 'deleteall_notfound@mail.meigetsu.jp',
                password: 'password01',
                account_type: 0,
            });
            const AppCreateResult = await Promise.all(
                [...Array(10)].map(() =>
                    AppMgr.Create(DeveloperIDForThisTest, {
                        name: 'name',
                        description: 'description',
                        redirect_uri: ['https://example.com/callback'],
                        privacy_policy: 'https://example.com/privacy',
                        terms_of_service: 'https://example.com/tos',
                        public: true,
                    })
                )
            ).then(r => r.filter((r): r is { client_id: string } => r !== null));
            GeneratedAppClientIDs.push(...AppCreateResult.map(r => r.client_id).sort());
        });
        it('OK', async () => {
            const beforeResult = await AppMgr.GetAll(DeveloperIDForThisTest);
            expect(beforeResult).toStrictEqual(
                GeneratedAppClientIDs.map(client_id => ({
                    client_id: client_id,
                    name: 'name',
                    description: 'description',
                    redirect_uri: ['https://example.com/callback'],
                    privacy_policy: 'https://example.com/privacy',
                    terms_of_service: 'https://example.com/tos',
                    developer: 'developer_name',
                })).sort()
            );
            const result = await AppMgr.DeleteAll(DeveloperIDForThisTest);
            expect(result).toBe(true);
            const deleted = await AppMgr.GetAll(DeveloperIDForThisTest);
            expect(deleted).toStrictEqual([]);
        });
        it('Not Found', async () => {
            const result = await AppMgr.DeleteAll(DeveloperIDForNotFoundTest);
            expect(result).toBe(false);
        });
    });
    describe('Auth', () => {
        const GeneratedApp = {
            confidential_app: {
                client_id: '',
                client_secret: '',
            },
            public_app: '',
        };
        const DeveloperIDForThisTest = '3010404006757';
        beforeAll(async () => {
            await AccountMgr.CreateForce({
                id: DeveloperIDForThisTest,
                user_id: 'app_auth_test',
                name: 'developer_name',
                mailaddress: 'app_auth_test@mail.meigetsu.jp',
                password: 'password01',
                account_type: 2,
            });
            const result = await AppMgr.Create(DeveloperIDForThisTest, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: false,
            });
            if (!result) throw new Error('Failed to create app');
            GeneratedApp.confidential_app.client_id = result.client_id;
            GeneratedApp.confidential_app.client_secret = result.client_secret || '';
            const result2 = await AppMgr.Create(DeveloperIDForThisTest, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            if (!result2) throw new Error('Failed to create app');
            GeneratedApp.public_app = result2.client_id;
        });
        it('OK/Confidential App', async () => {
            const result = await AppMgr.Auth({
                client_id: GeneratedApp.confidential_app.client_id,
                client_secret: GeneratedApp.confidential_app.client_secret,
                scope: ['user.read', 'user.write'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            expect(result).toMatch(/^[0-9]{16}$/);
        });
        it('OK/Public App', async () => {
            const result = await AppMgr.Auth({
                client_id: GeneratedApp.public_app,
                scope: ['user.read'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            expect(result).toMatch(/^[0-9]{16}$/);
        });
        it('Client ID Not Found', async () => {
            const result = await AppMgr.Auth({
                client_id: 'app-notfound',
                scope: ['user.read', 'user.write'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            expect(result).toBeNull();
        });
        it('Redirect URI Not Match', async () => {
            const result = await AppMgr.Auth({
                client_id: GeneratedApp.confidential_app.client_id,
                client_secret: GeneratedApp.confidential_app.client_secret,
                scope: ['user.read', 'user.write'],
                redirect_uri: 'https://example.com/not_match',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            expect(result).toBeNull();
        });
        it('Scope Not Found', async () => {
            const result = await AppMgr.Auth({
                client_id: GeneratedApp.confidential_app.client_id,
                client_secret: GeneratedApp.confidential_app.client_secret,
                scope: ['user.read', 'user.write', 'user.delete'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            expect(result).toBeNull();
        });
        it('Not allowed scope/User Level', async () => {
            const result = await AppMgr.Auth({
                client_id: GeneratedApp.confidential_app.client_id,
                client_secret: GeneratedApp.confidential_app.client_secret,
                scope: ['supervisor'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            expect(result).toBeNull();
        });
        it('Not allowed scope/App Type', async () => {
            const result = await AppMgr.Auth({
                client_id: GeneratedApp.public_app,
                scope: ['personal.read'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            expect(result).toBeNull();
        });
    });
    describe('Get Authorized App', () => {
        const AuthorizedApp = {
            auth_id: '',
        };
        beforeAll(async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            if (!result) throw new Error('Failed to create app');
            const GeneratedAuthID = await AppMgr.Auth({
                client_id: result.client_id,
                scope: ['user.read', 'user.write'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            if (!GeneratedAuthID) throw new Error('Failed to auth');
            AuthorizedApp.auth_id = GeneratedAuthID;
        });
        it('OK', async () => {
            const result = await AppMgr.GetAuthorizedApp(AuthorizedApp.auth_id);
            expect(result).toStrictEqual({
                client_id: expect.stringMatching(AppIDPattern),
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                developer: '明月',
                scope: ['user.read', 'user.write'],
            });
        });
        it('Not Found', async () => {
            const result = await AppMgr.GetAuthorizedApp('app-notfound');
            expect(result).toBeNull();
        });
    });
    describe('Create Authorization Code', () => {
        const AuthorizedApp = {
            auth_id: '',
        };
        beforeAll(async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            if (!result) throw new Error('Failed to create app');
            const GeneratedAuthID = await AppMgr.Auth({
                client_id: result.client_id,
                scope: ['user.read', 'user.write'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            if (!GeneratedAuthID) throw new Error('Failed to auth');
            AuthorizedApp.auth_id = GeneratedAuthID;
        });
        it('OK', async () => {
            const result = await AppMgr.CreateAuthorizationCode(AuthorizedApp.auth_id, DeveloperID);
            expect(result).toMatch(/^[0-9]{16}$/);
            // 認可実施用ＩＤの削除チェック
            expect(await AppMgr.GetAuthorizedApp(AuthorizedApp.auth_id)).toBeNull();
        });
        it('Not Found', async () => {
            const result = await AppMgr.CreateAuthorizationCode('app-notfound', DeveloperID);
            expect(result).toBeNull();
        });
    });
    describe('Get Token Issue Information', () => {
        const Record = {
            client_id: '',
            code: '',
        };
        beforeAll(async () => {
            const result = await AppMgr.Create(DeveloperID, {
                name: 'name',
                description: 'description',
                redirect_uri: ['https://example.com/callback'],
                privacy_policy: 'https://example.com/privacy',
                terms_of_service: 'https://example.com/tos',
                public: true,
            });
            if (!result) throw new Error('Failed to create app');
            Record.client_id = result.client_id;
            const GeneratedAuthID = await AppMgr.Auth({
                client_id: result.client_id,
                scope: ['user.read', 'user.write'],
                redirect_uri: 'https://example.com/callback',
                code_challenge: 'code_challenge',
                code_challenge_method: 'plain',
            });
            if (!GeneratedAuthID) throw new Error('Failed to auth');
            const GeneratedAuthCode = await AppMgr.CreateAuthorizationCode(GeneratedAuthID, DeveloperID);
            if (!GeneratedAuthCode) throw new Error('Failed to create auth code');
            Record.code = GeneratedAuthCode;
        });
        it('OK', async () => {
            const result = await AppMgr.GetTokenIssueInformation(Record.code, 'code_challenge');
            expect(result).toStrictEqual({
                app: Record.client_id,
                id: DeveloperID,
                scope: ['user.read', 'user.write'],
            });
            expect(await AppMgr.GetTokenIssueInformation(Record.code, 'code_challenge')).toBeNull();
        });
        it('Not Found', async () => {
            const result = await AppMgr.GetTokenIssueInformation('app-notfound', 'code_challenge');
            expect(result).toBeNull();
        });
        it('Code Verifier Not Match', async () => {
            const result = await AppMgr.GetTokenIssueInformation(Record.code, 'code_challenge_not_match');
            expect(result).toBeNull();
        });
    });
});
