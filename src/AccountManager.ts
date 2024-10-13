import CorpProfileGenerator from '@meigetsuid/corpprofilegen';
import CreateID from '@meigetsuid/idgenerator';
import IOManager from '@meigetsuid/iomanager';
import { AppIDPattern, SystemIDPattern, VirtualIDPattern } from './Pattern';
import { writeFile } from 'nodeeasyfileio';
import IORedis from 'ioredis';
import { generate } from 'randomstring';
import { CreateIDToken } from './IDToken';

export default class AccountManager {
    private CorpProfileGen: CorpProfileGenerator;
    constructor(
        NTAAppKey: string,
        private Account = new IOManager.Account(),
        private VirtualID = new IOManager.VirtualID(),
        private Token = new IOManager.Token('supervisor'),
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
            this.Token[Symbol.asyncDispose](),
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
    private async CreateIDToken(VirtualID: string, IDTokenExpiresMin: number, IssueDate: Date = new Date()) {
        const VIDInfo = await this.VirtualID.GetLinkedInformation(VirtualID);
        /* v8 ignore next */
        if (!VIDInfo) throw new Error('Virtual ID is not found');
        const AgeRate =
            VIDInfo.account_type % 2 === 0 && VIDInfo.account_type !== 0
                ? await fetch(`http://localhost:7900/profile/${VIDInfo.id}/age_rate`)
                      .then(res => res.json())
                      .then(profile => profile.result)
                : 'N';
        return CreateIDToken({
            virtual_id: VirtualID,
            app_id: VIDInfo.app,
            user_id: VIDInfo.user_id,
            name: VIDInfo.name,
            mailaddress: VIDInfo.mailaddress,
            account_type: VIDInfo.account_type,
            issue_at: IssueDate,
            expires_min: IDTokenExpiresMin,
            age_rate: AgeRate,
        });
    }
    public async IssueToken(
        arg: {
            id: string;
            app_id?: string;
            scopes: string[];
        },
        IssueDate = new Date(),
        ReservedExpiresMin: Partial<{ access_token: number; refresh_token: number; id_token: number }> = {
            access_token: 180,
            refresh_token: 10080,
            id_token: 480,
        }
    ): Promise<{
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
        const ExpiresMin = {
            access_token: ReservedExpiresMin.access_token || 180,
            refresh_token: ReservedExpiresMin.refresh_token || 10080,
            id_token: ReservedExpiresMin.id_token || 480,
        };
        if (arg.app_id) {
            if (!SystemIDPattern.test(arg.id)) throw new Error('Invalid System ID');
            if (!AppIDPattern.test(arg.app_id)) throw new Error('Invalid App ID');
            const VirtualID = await this.VirtualID.GetVirtualID(arg.app_id, arg.id);
            return this.IssueToken({ id: VirtualID, scopes: arg.scopes }, IssueDate);
        }
        if (!VirtualIDPattern.test(arg.id)) throw new Error('Invalid Virtual ID');
        const Ret = await this.Token.CreateToken(arg.id, arg.scopes, IssueDate, {
            access_token: ExpiresMin.access_token,
            refresh_token: ExpiresMin.refresh_token,
        });
        if (arg.scopes.includes('openid')) {
            Ret['id_token'] = await this.CreateIDToken(arg.id, ExpiresMin.id_token, IssueDate);
            Ret['expires_at']['id_token'] = new Date(IssueDate.getTime() + ExpiresMin.id_token * 60000);
        }
        return Ret;
    }
    public async Refresh(
        RefreshToken: string,
        RefreshDate: Date = new Date(),
        ReservedExpiresMin: Partial<{ access_token: number; refresh_token: number; id_token: number }> = {
            access_token: 180,
            refresh_token: 10080,
            id_token: 480,
        }
    ) {
        const Ret = await this.Token.Refresh(RefreshToken, RefreshDate, {
            access_token: ReservedExpiresMin.access_token || 180,
            refresh_token: ReservedExpiresMin.refresh_token || 10080,
        });
        if (!Ret) return null;
        const VirtualID = await this.Token.Check(Ret.access_token, ['openid']);
        if (!VirtualID) return Ret;
        Ret['id_token'] = await this.CreateIDToken(VirtualID, ReservedExpiresMin.id_token || 480, RefreshDate);
        Ret['expires_at']['id_token'] = new Date(RefreshDate.getTime() + (ReservedExpiresMin.id_token || 480) * 60000);
        return Ret;
    }
    public async SignOut(AccessToken: string) {
        const Result = await this.Token.Revoke(AccessToken);
        return { status: Result ? 200 : 404 };
    }
    public async GetByAccessToken(AccessToken: string) {
        const VirtualID = await this.Token.Check(AccessToken, ['user.read']);
        if (!VirtualID) return { status: 401 };
        const VIDInfo = await this.VirtualID.GetLinkedInformation(VirtualID);
        /* v8 ignore next */
        if (!VIDInfo) throw new Error('Virtual ID is not found');
        const AccountInfo = await this.Account.SGetAccount(VIDInfo.id);
        /* v8 ignore next */
        if (!AccountInfo) throw new Error('Account is not found');
        return { status: 200, body: AccountInfo };
    }
    public async GetByUserID(UserID: string) {
        const Result = await this.Account.GetAccount(UserID);
        return Result ? { status: 200, body: Result } : { status: 404 };
    }
    public async Update(
        AccessToken: string,
        newProfile: Partial<{ user_id: string; name: string; mailaddress: string; password: string }>
    ) {
        const VirtualID = await this.Token.Check(AccessToken, ['user.write']);
        if (!VirtualID) return { status: 401 };
        const VIDInfo = await this.VirtualID.GetLinkedInformation(VirtualID);
        /* v8 ignore next */
        if (!VIDInfo) throw new Error('Virtual ID is not found');
        if (newProfile.mailaddress) {
            const CacheInfo = await this.CacheMailAddress({ mailaddress: newProfile.mailaddress, id: VIDInfo.id });
            return { status: 200, body: CacheInfo };
        } else {
            const AccountProfile = await this.Account.SGetAccount(VIDInfo.id);
            if (!AccountProfile || AccountProfile.account_type % 2 === 0 || AccountProfile.account_type === 0)
                return { status: 404 };
            await this.Account.UpdateAccount(VIDInfo.id, newProfile);
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
        const VirtualID = await this.Token.Check(AccessToken, ['user.write']);
        if (!VirtualID) return { status: 401 };
        const AccountInfo = await this.VirtualID.GetLinkedInformation(VirtualID);
        /* v8 ignore next */
        if (!AccountInfo) throw new Error('Virtual ID is not found');
        const VirtualIDs = await this.VirtualID.GetAllVirtualIDBySystemID(AccountInfo.id);
        const Apps = await this.Application.GetApps(AccountInfo.id).then(apps => apps.map(app => app.client_id));
        VirtualIDs.push(
            ...(await Promise.all(Apps.map(AppID => this.VirtualID.GetAllVirtualIDByAppID(AppID))).then(result =>
                result.flat()
            ))
        );
        const Promises = [
            ...VirtualIDs.map(VirtualID => {
                return this.Token.RevokeAll(VirtualID).catch((er: Error) => {
                    writeFile('./system/error/token/revoke.log', `${VirtualID} : ${er.message}\n`, true);
                    return false;
                });
            }),
            this.VirtualID.DeleteAccount(AccountInfo.id).catch((er: Error) => {
                writeFile(
                    './system/error/virtualid/delete.log',
                    `Virtual ID Delete Error: ${AccountInfo.id} : ${er.message}\n`,
                    true
                );
                return false;
            }),
            ...Apps.map(AppID =>
                this.VirtualID.DeleteApp(AppID).catch((er: Error) => {
                    writeFile(
                        './system/error/virtualid/delete.log',
                        `Virtual ID Delete Error: ${AppID} : ${er.message}\n`,
                        true
                    );
                    return false;
                })
            ),
            this.Application.DeleteApps(AccountInfo.id).catch((er: Error) => {
                writeFile(
                    './system/error/application/delete.log',
                    `Application Delete Error: ${AccountInfo.id} : ${er.message}\n`,
                    true
                );
                return false;
            }),
            this.Account.DeleteAccount(AccountInfo.id).catch((er: Error) => {
                writeFile(
                    './system/error/account/delete.log',
                    `Account Delete Error: ${AccountInfo.id} : ${er.message}\n`,
                    true
                );
                return false;
            }),
        ];
        const Result = await Promise.all(Promises)
            .then(results => {
                const Ret = results.every(result => result);
                if (!Ret) {
                    const ErrorProcessID = results.filter(result => !result).map((_, index) => index);
                    writeFile(
                        './system/error/account/master.log',
                        `Account Delete Error: ${AccountInfo.id} : ${ErrorProcessID.join(', ')}\n`,
                        true
                    );
                }
                return Ret;
            })
            .catch((er: Error) => {
                writeFile('./system/error.log', `Account Delete Error: ${AccountInfo.id} : ${er.message}\n`, true);
                return false;
            });
        if (!Result) throw new Error('Account Delete Error');
    }
}
