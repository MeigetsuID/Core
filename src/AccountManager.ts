import CorpProfileGenerator from '@meigetsuid/corpprofilegen';
import CreateID from '@meigetsuid/idgenerator';
import IOManager from '@meigetsuid/iomanager';
import { AppIDPattern, SystemIDPattern, VirtualIDPattern } from './Pattern';
import { readFile, writeFile } from 'nodeeasyfileio';
import { ToHash } from '@meigetsusoft/hash';
import IORedis from 'ioredis';
import { generate } from 'randomstring';
import { CreateIDToken } from './IDToken';
import { unlinkSync } from 'node:fs';

export default class AccountManager {
    private CorpProfileGen: CorpProfileGenerator;
    private static readonly AgeRate = JSON.parse(readFile('./system/age_rate.json')) as {
        age_rates: { min: number; max?: number; rate: string }[];
    };
    constructor(
        NTAAppKey: string,
        private Account = new IOManager.Account(),
        private VirtualID = new IOManager.VirtualID(),
        private AccessToken = new IOManager.AccessToken('supervisor'),
        private RefreshToken = new IOManager.RefreshToken(),
        private Application = new IOManager.Application(),
        private Redis = new IORedis({ db: 0 })
    ) {
        this.CorpProfileGen = new CorpProfileGenerator(NTAAppKey);
    }
    /* v8 ignore next 9 */
    [Symbol.asyncDispose]() {
        return Promise.all([
            this.Account[Symbol.asyncDispose](),
            this.Application[Symbol.asyncDispose](),
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
        await this.Redis.del(PreEntryID);
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
    public async IssueToken(arg: {
        id: string;
        app_id?: string;
        scopes: string[];
        expires_min?: { access_token?: number; refresh_token?: number; id_token?: number };
    }): Promise<{
        token_type: string;
        access_token: string;
        refresh_token: string;
        id_token?: string;
        expires_at: {
            access_token: Date;
            refresh_token: Date;
            id_token?: Date;
        };
    }> {
        const ExpiresMin = arg.expires_min
            ? {
                  access_token: arg.expires_min.access_token || 180,
                  refresh_token: arg.expires_min.refresh_token || 10080,
                  id_token: arg.expires_min.id_token || 480,
              }
            : {
                  access_token: 180,
                  refresh_token: 10080,
                  id_token: 480,
              };
        if (arg.app_id) {
            if (!SystemIDPattern.test(arg.id)) throw new Error('Invalid System ID');
            if (!AppIDPattern.test(arg.app_id)) throw new Error('Invalid App ID');
            const VirtualID = await this.VirtualID.GetVirtualID(arg.app_id, arg.id);
            return this.IssueToken({ id: VirtualID, scopes: arg.scopes, expires_min: ExpiresMin });
        }
        const IssueDate = new Date();
        if (!VirtualIDPattern.test(arg.id)) throw new Error('Invalid Virtual ID');
        const AccessToken = await this.AccessToken.CreateAccessToken(
            arg.id,
            arg.scopes,
            IssueDate,
            ExpiresMin.access_token
        );
        const RefreshToken = await this.RefreshToken.CreateRefreshToken(
            arg.id,
            arg.scopes,
            IssueDate,
            ExpiresMin.refresh_token
        );
        writeFile(`./system/account/token/${ToHash(AccessToken.token, 'romeo')}`, RefreshToken.token);
        writeFile(`./system/account/token/${ToHash(RefreshToken.token, 'sierra')}`, AccessToken.token);
        const Ret = {
            token_type: 'Bearer',
            access_token: AccessToken.token,
            refresh_token: RefreshToken.token,
            expires_at: {
                access_token: AccessToken.expires_at,
                refresh_token: RefreshToken.expires_at,
            },
        };
        if (arg.scopes.includes('openid')) {
            const VIDInfo = await this.VirtualID.GetLinkedInformation(arg.id);
            /* v8 ignore next */
            if (!VIDInfo) throw new Error('Virtual ID is not found');
            const AgeRate =
                VIDInfo.account_type % 2 === 0 && VIDInfo.account_type !== 0
                    ? await fetch('http://localhost:7900/profile/' + VIDInfo.id)
                          .then(res => res.json())
                          .then(profile => {
                              const Target = AccountManager.AgeRate.age_rates.find(
                                  rate => rate.min <= profile.age && (rate.max ? rate.max >= profile.age : true)
                              );
                              return Target ? Target.rate : 'N';
                          })
                    : 'N';
            const IDToken = CreateIDToken({
                virtual_id: arg.id,
                app_id: VIDInfo.app,
                user_id: VIDInfo.user_id,
                name: VIDInfo.name,
                mailaddress: VIDInfo.mailaddress,
                account_type: VIDInfo.account_type,
                issue_at: IssueDate,
                expires_min: ExpiresMin.id_token,
                age_rate: AgeRate,
            });
            Ret['id_token'] = IDToken;
            Ret['expires_at']['id_token'] = new Date(IssueDate.getTime() + ExpiresMin.id_token * 60000);
        }
        return Ret;
    }
    public async Refresh(RefreshToken: string) {
        const TokenInformation = await this.RefreshToken.Check(RefreshToken);
        if (!TokenInformation) return { status: 401 };
        const LinkedAccessToken = readFile(`./system/account/token/${ToHash(RefreshToken, 'sierra')}`);
        await this.AccessToken.Revoke(LinkedAccessToken);
        await this.RefreshToken.Revoke(RefreshToken);
        unlinkSync(`./system/account/token/${ToHash(LinkedAccessToken, 'romeo')}`);
        unlinkSync(`./system/account/token/${ToHash(RefreshToken, 'sierra')}`);
        return await this.IssueToken({ id: TokenInformation.virtual_id, scopes: TokenInformation.scopes });
    }
    public async SignOut(AccessToken: string) {
        const PairRefreshToken = readFile(`./system/account/token/${ToHash(AccessToken, 'romeo')}`);
        unlinkSync(`./system/account/token/${ToHash(AccessToken, 'romeo')}`);
        unlinkSync(`./system/account/token/${ToHash(PairRefreshToken, 'sierra')}`);
        await this.AccessToken.Revoke(AccessToken);
        await this.RefreshToken.Revoke(PairRefreshToken);
        return { status: 200 };
    }
    public async GetByAccessToken(AccessToken: string) {
        const SystemID = await this.AccessToken.Check(AccessToken, ['user.read'], true);
        if (!SystemID) return { status: 401 };
        const AccountInfo = await this.Account.SGetAccount(SystemID);
        return AccountInfo ? { status: 200, body: AccountInfo } : { status: 404 };
    }
    public async GetByUserID(UserID: string) {
        const Result = await this.Account.GetAccount(UserID);
        return Result ? { status: 200, body: Result } : { status: 404 };
    }
    public async Update(
        AccessToken: string,
        newProfile: Partial<{ user_id: string; name: string; mailaddress: string; password: string }>
    ) {
        const SystemID = await this.AccessToken.Check(AccessToken, ['user.write'], true);
        if (!SystemID) return { status: 401 };
        if (newProfile.mailaddress) {
            const CacheInfo = await this.CacheMailAddress({ mailaddress: newProfile.mailaddress, id: SystemID });
            return { status: 200, body: CacheInfo };
        } else {
            const AccountProfile = await this.Account.SGetAccount(SystemID);
            if (!AccountProfile || AccountProfile.account_type % 2 === 0 || AccountProfile.account_type === 0)
                return { status: 404 };
            await this.Account.UpdateAccount(SystemID, newProfile);
            return { status: 200 };
        }
    }
    public async UpdateMailAddress(CacheID: string) {
        const UseMailAddressInfo = await this.ReadMailAddressFromCache(CacheID);
        if (UseMailAddressInfo.status === 404 || !UseMailAddressInfo.body.id) return { status: 404 };
        await this.Account.UpdateAccount(UseMailAddressInfo.body.id, {
            mailaddress: UseMailAddressInfo.body.mailaddress,
        });
        await this.Redis.del(CacheID);
        return { status: 200 };
    }
    public async Delete(AccessToken: string) {
        const SystemID = await this.AccessToken.Check(AccessToken, ['user.write'], true);
        if (!SystemID) return { status: 401 };
        const RefreshToken = readFile(`./system/account/token/${ToHash(AccessToken, 'romeo')}`);
        const Promises = [
            this.AccessToken.Revoke(AccessToken),
            this.RefreshToken.Revoke(RefreshToken),
            this.VirtualID.DeleteAccount(SystemID),
            this.Application.DeleteApps(SystemID),
            this.Account.DeleteAccount(SystemID),
        ];
        return await Promise.all(Promises).then(results => ({ status: results.every(result => result) ? 200 : 500 }));
    }
}
