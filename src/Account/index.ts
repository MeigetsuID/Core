import express from 'express';
import AccountManager from './AccountManager';
import { valid as preentrycheck } from './Validator/preentry';
import { valid as entrycheck } from './Validator/entry';

export default class Account {
    private AccountMgr: AccountManager;
    constructor(
        NTAAppKey: string,
        private app = express()
    ) {
        this.AccountMgr = new AccountManager(NTAAppKey);
        this.app.post('/', async (req, res) => {
            if (!preentrycheck(req.body)) return res.sendStatus(400);
            const result = await this.AccountMgr.PreEntry(req.body as string);
            if (result.status !== 201) return res.sendStatus(result.status);
            return process.env.RUNNING_MODE && process.env.RUNNING_MODE.toUpperCase() === 'DEBUG'
                ? res.status(201).send(result.body)
                : res.send(result.body);
        });
        this.app.post('/:preentry_id', async (req, res) => {
            if (!entrycheck(req.body)) return res.sendStatus(400);
            const result = await this.AccountMgr.Entry(
                req.params.preentry_id,
                'corp_number' in req.body
                    ? (req.body as { user_id: string; corp_number: string; password: string })
                    : (req.body as { user_id: string; name: string; password: string })
            );
            if (result.status !== 201) return res.sendStatus(result.status);
        });
    }
    public get App() {
        return this.app;
    }
}
