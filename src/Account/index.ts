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
        this.app.post('/', express.text(), async (req, res) => {
            const Process = async () => {
                if (!preentrycheck(req.body))
                    return res.status(400).contentType('text/plain').send('Invalid mail address');
                const result = await this.AccountMgr.PreEntry(req.body as string);
                if (result.status !== 201) return res.status(result.status).contentType('text/plain').send(result.body);
                return process.env.RUNNING_MODE && process.env.RUNNING_MODE.toUpperCase() === 'DEBUG'
                    ? res.status(201).json(result.body)
                    : res.sendStatus(201);
            };
            /* v8 ignore next 4 */
            Process().catch(err => {
                console.error(err);
                res.sendStatus(500);
            });
        });
        this.app.post('/:preentry_id', express.json(), async (req, res) => {
            const Process = async () => {
                if (!entrycheck(req.body)) return res.sendStatus(400);
                const result = await this.AccountMgr.Entry(
                    req.params.preentry_id,
                    'corp_number' in req.body
                        ? (req.body as { user_id: string; corp_number: string; password: string })
                        : (req.body as { user_id: string; name: string; password: string })
                );
                return result.status === 201
                    ? res.sendStatus(201)
                    : res.status(result.status).contentType('text/plain').send(result.body);
            };
            /* v8 ignore next 4 */
            Process().catch(err => {
                console.error(err);
                res.sendStatus(500);
            });
        });
    }
    public get App() {
        return this.app;
    }
}
