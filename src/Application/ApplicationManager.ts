import IOManager from '@meigetsuid/iomanager';
import {
    CreateApplicationArg,
    ResApplicationInformation,
    UpdateApplicationInformation,
} from '@meigetsuid/iomanager/dist/@types/ApplicationManager';
import { ToHash } from '@meigetsusoft/hash';
import IORedis from 'ioredis';
import { readJson } from 'nodeeasyfileio';
import { generate } from 'randomstring';

type ScopeInformation = {
    name: string;
    description: string;
    min_level: number;
    allow_public: boolean;
};

export default class ApplicationManager {
    constructor(
        private AppMgr = new IOManager.Application(),
        private redis = new IORedis({ db: 0 })
    ) {}
    public async Create(
        DeveloperID: string,
        arg: CreateApplicationArg
    ): Promise<{ client_id: string; client_secret?: string } | null> {
        return this.AppMgr.CreateApp(DeveloperID, arg);
    }
    public async Get(AppID: string): Promise<ResApplicationInformation | null> {
        return this.AppMgr.GetApp(AppID);
    }
    public async GetAll(DeveloperID: string): Promise<ResApplicationInformation[]> {
        return this.AppMgr.GetApps(DeveloperID);
    }
    public async Update(
        AppID: string,
        arg: UpdateApplicationInformation
    ): Promise<{ client_id: string; client_secret?: string } | null> {
        return this.AppMgr.UpdateApp(AppID, arg);
    }
    public async Delete(AppID: string): Promise<boolean> {
        return this.AppMgr.DeleteApp(AppID);
    }
    public async DeleteAll(DeveloperID: string): Promise<boolean> {
        return this.AppMgr.DeleteApps(DeveloperID);
    }
    private async CreateAuthID(AppID: string, CodeChallenge: string, CodeChallengeMethod: string, Scope: string[]) {
        const AuthID = generate({ length: 16, charset: 'numeric' });
        const RedisSaveAuthID = `appauth-${AuthID}`;
        if (await this.redis.exists(RedisSaveAuthID))
            /* v8 ignore next */
            return this.CreateAuthID(AppID, CodeChallenge, CodeChallengeMethod, Scope);
        await this.redis.set(
            RedisSaveAuthID,
            JSON.stringify({ app: AppID, cc: CodeChallenge, ccm: CodeChallengeMethod, sc: Scope }),
            'EX',
            5 * 60000
        );
        return AuthID;
    }
    public async Auth(arg: {
        client_id: string;
        client_secret?: string;
        scope: string[];
        redirect_uri: string;
        code_challenge: string;
        code_challenge_method: string;
    }): Promise<string | null> {
        const DeveloperInfo = await this.AppMgr.AuthApp(arg.client_id, arg.client_secret || 'public', arg.redirect_uri);
        if (!DeveloperInfo) return null;
        const Scopes = readJson<{ scopes: ScopeInformation[] }>('./system/scopes.json');
        const AllowedScopes = Scopes.scopes
            .filter(i => i.min_level >= DeveloperInfo.account_type && (!arg.client_secret ? i.allow_public : true))
            .map(i => i.name);
        return arg.scope.every(i => AllowedScopes.includes(i))
            ? this.CreateAuthID(arg.client_id, arg.code_challenge, arg.code_challenge_method, arg.scope)
            : null;
    }
    public async GetAuthorizedApp(AuthID: string): Promise<(ResApplicationInformation & { scope: string[] }) | null> {
        const Record = await this.redis.get(`appauth-${AuthID}`);
        if (!Record) return null;
        const AppInfo = JSON.parse(Record) as { app: string; cc: string; ccm: string; sc: string[] };
        const AppRecord = await this.Get(AppInfo.app);
        /* v8 ignore next */
        return AppRecord ? { ...AppRecord, scope: AppInfo.sc } : null;
    }
    private async InternalCreateAuthorizationCode(
        AuthorizedAccountSystemID: string,
        AppInfo: { app: string; cc: string; ccm: string; sc: string[] }
    ): Promise<string> {
        const AuthCode = generate({ length: 16, charset: 'numeric' });
        const RedisSaveAuthCode = `authcode-${AuthCode}`;
        if (await this.redis.exists(RedisSaveAuthCode))
            /* v8 ignore next */
            return this.InternalCreateAuthorizationCode(AuthorizedAccountSystemID, AppInfo);
        await this.redis.set(
            RedisSaveAuthCode,
            JSON.stringify({ ...AppInfo, id: AuthorizedAccountSystemID }),
            'EX',
            5 * 60000
        );
        return AuthCode;
    }
    public async CreateAuthorizationCode(AuthID: string, AuthorizedAccountSystemID: string): Promise<string | null> {
        const Record = await this.redis.get(`appauth-${AuthID}`);
        if (!Record) return null;
        const AppInfo = JSON.parse(Record) as { app: string; cc: string; ccm: string; sc: string[] };
        const AuthCode = this.InternalCreateAuthorizationCode(AuthorizedAccountSystemID, AppInfo);
        await this.redis.del(`appauth-${AuthID}`);
        return AuthCode;
    }
    public async GetTokenIssueInformation(
        AuthCode: string,
        CodeVerifier: string
    ): Promise<{ app: string; id: string; scope: string[] } | null> {
        const Record = await this.redis.get(`authcode-${AuthCode}`);
        if (!Record) return null;
        const AppInfo = JSON.parse(Record) as { app: string; cc: string; ccm: string; sc: string[]; id: string };
        if (AppInfo.cc !== ToHash(CodeVerifier, AppInfo.ccm)) return null;
        await this.redis.del(`authcode-${AuthCode}`);
        return { app: AppInfo.app, id: AppInfo.id, scope: AppInfo.sc };
    }
}
