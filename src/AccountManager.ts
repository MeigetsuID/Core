import CorpProfileGenerator from '@meigetsuid/corpprofilegen';
import CreateID from '@meigetsuid/idgenerator';
import IOManager from '@meigetsuid/iomanager';

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
}
