import CorpProfileGenerator from '@meigetsuid/corpprofilegen';
import CreateID from '@meigetsuid/idgenerator';
import IOManager from '@meigetsuid/iomanager';
import { SystemIDPattern, VirtualIDPattern } from './Pattern';

export default class AccountManager {
    private CorpProfileGen: CorpProfileGenerator;
    constructor(
        NTAAppKey: string,
        private Account = new IOManager.Account(),
        private VirtualID = new IOManager.VirtualID(),
        private AccessToken = new IOManager.AccessToken('supervisor'),
        private RefreshToken = new IOManager.RefreshToken()
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
    private async CreateAccount(arg: {
        id: string;
        user_id: string;
        name: string;
        mailaddress: string;
        password: string;
        account_type: number;
    }) {
        await this.Account.CreateAccount(arg);
    }
    public async Create(
        arg:
            | {
                  user_id: string;
                  name: string;
                  mailaddress: string;
                  password: string;
              }
            | {
                  user_id: string;
                  corp_number: string;
                  mailaddress: string;
                  password: string;
              }
    ) {
        await this.Account.CreateAccount(
            'corp_number' in arg
                ? await this.CorpProfileGen.Create(arg)
                : {
                      ...arg,
                      id: await CreateID(arg.user_id),
                      account_type: 4,
                  }
        );
    }
    public async CreateForce(arg: {
        id: string;
        user_id: string;
        name: string;
        mailaddress: string;
        password: string;
        account_type: number;
    }) {
        await this.CreateAccount(arg);
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
}
