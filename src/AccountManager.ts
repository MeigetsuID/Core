import CorpProfileGenerator from '@meigetsuid/corpprofilegen';
import CreateID from '@meigetsuid/idgenerator';
import IOManager from '@meigetsuid/iomanager';
import { SystemIDPattern, VirtualIDPattern } from './Pattern';
import { readFile, writeFile } from 'nodeeasyfileio';
import { ToHash } from '@meigetsusoft/hash';
import IORedis from 'ioredis';
import { generate } from 'randomstring';

export default class AccountManager {
    private CorpProfileGen: CorpProfileGenerator;
    constructor(
        NTAAppKey: string,
        private Account = new IOManager.Account(),
        private VirtualID = new IOManager.VirtualID(),
        private AccessToken = new IOManager.AccessToken('supervisor'),
        private RefreshToken = new IOManager.RefreshToken(),
        private Redis = new IORedis({ db: 0 })
    ) {
        this.CorpProfileGen = new CorpProfileGenerator(NTAAppKey);
    }
    [Symbol.asyncDispose]() {
        return Promise.all([
            this.Account[Symbol.asyncDispose](),
            this.VirtualID[Symbol.asyncDispose](),
            this.AccessToken[Symbol.asyncDispose](),
            this.RefreshToken[Symbol.asyncDispose](),
        ]);
    }
    private async CacheMailAddress(
        arg: { mailaddress: string; id?: string },
        expireSec: number = 300
    ): Promise<{ id: string; expires_at: Date }> {
        const CacheID = generate({ length: 8, charset: 'numeric' });
        const Expire = new Date(Date.now() + expireSec * 1000);
        if (await this.Redis.exists(CacheID)) return this.CacheMailAddress(arg);
        await this.Redis.set(CacheID, JSON.stringify(arg), 'EXAT', Expire.getTime());
        return { id: CacheID, expires_at: Expire };
    }
    private async ReadMailAddressFromCache(
        CacheID: string
    ): Promise<{ status: 404 } | { status: 200; body: { mailaddress: string; id?: string } }> {
        const Record = await this.Redis.get(CacheID);
        return Record
            ? { status: 200, body: JSON.parse(Record) as { mailaddress: string; id?: string } }
            : { status: 404 };
    }
    public async PreEntry(
        mailaddress: string
    ): Promise<{ status: number; body: string | { id: string; expires_at: Date } }> {
        return (await this.Account.Available({ mailaddress: mailaddress }))
            ? { status: 201, body: await this.CacheMailAddress({ mailaddress: mailaddress }) }
            : { status: 400, body: 'このメールアドレスは既に使用されています' };
    }
    public async Entry(
        PreEntryID: string,
        profile:
            | { corp_number: string; user_id: string; password: string }
            | { name: string; user_id: string; password: string }
    ) {
        const UseMailAddressInfo = await this.ReadMailAddressFromCache(PreEntryID);
        if (UseMailAddressInfo.status === 404 || UseMailAddressInfo.body.id) return { status: 404 };
        if (!(await this.Account.Available({ user_id: profile.user_id })))
            return { status: 400, body: 'このユーザーＩＤは使用できません' };
        if ('corp_number' in profile && !(await this.Account.Available({ corp_number: profile.corp_number })))
            return { status: 400, body: 'この法人のアカウントは既に登録されています。' };
        const Parameter =
            'corp_number' in profile
                ? await this.CorpProfileGen.Create({ ...profile, mailaddress: UseMailAddressInfo.body.mailaddress })
                : {
                      ...profile,
                      id: await CreateID(profile.user_id),
                      mailaddress: UseMailAddressInfo.body.mailaddress,
                      account_type: 4,
                  };
        await this.Account.CreateAccount(Parameter);
        return { status: 201 };
    }
    public async CreateForce(arg: {
        id: string;
        user_id: string;
        name: string;
        mailaddress: string;
        password: string;
        account_type: number;
    }) {
        await this.Account.CreateAccount(arg);
    }
    public async SignIn(ID: string, Password: string) {
        return await this.Account.SignIn(ID, Password);
    }
    public async IssueToken(arg: { id: string; AppID?: string; scopes: string[] }): Promise<{
        token_type: string;
        access_token: string;
        refresh_token: string;
        expires_at: {
            access_token: Date;
            refresh_token: Date;
        };
    }> {
        if (arg.AppID) {
            if (!SystemIDPattern.test(arg.id)) throw new Error('Invalid System ID');
            if (!SystemIDPattern.test(arg.AppID)) throw new Error('Invalid App ID');
            const VirtualID = await this.VirtualID.GetVirtualID(arg.id, arg.AppID);
            return this.IssueToken({ id: VirtualID, scopes: arg.scopes });
        }
        if (!VirtualIDPattern.test(arg.id)) throw new Error('Invalid Virtual ID');
        const AccessToken = await this.AccessToken.CreateAccessToken(arg.id, arg.scopes);
        const RefreshToken = await this.RefreshToken.CreateRefreshToken(arg.id, arg.scopes);
        writeFile(`./system/account/token/${ToHash(AccessToken.token, 'romeo')}`, RefreshToken.token);
        return {
            token_type: 'Bearer',
            access_token: AccessToken.token,
            refresh_token: RefreshToken.token,
            expires_at: {
                access_token: AccessToken.expires_at,
                refresh_token: RefreshToken.expires_at,
            },
        };
    }
    public async SignOut(AccessToken: string) {
        const PairRefreshToken = readFile(`./system/account/token/${ToHash(AccessToken, 'romeo')}`);
        await this.AccessToken.Revoke(AccessToken);
        await this.RefreshToken.Revoke(PairRefreshToken);
    }
    public async GetByAccessToken(AccessToken: string) {
        const SystemID = await this.AccessToken.Check(AccessToken, ['user.read'], true);
        if (!SystemID) return { status: 401 };
        return { status: 200, body: await this.Account.SGetAccount(SystemID) };
    }
    public async GetByUserID(UserID: string) {
        return await this.Account.GetAccount(UserID);
    }
}