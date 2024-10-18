import { readFile, readJson } from 'nodeeasyfileio';
import { sign } from 'jsonwebtoken';

export function CreateIDToken(arg: {
    virtual_id: string;
    app_id: string;
    user_id: string;
    name: string;
    mailaddress: string;
    account_type: number;
    issue_at: Date;
    expires_min?: number;
    nonce?: string;
    age_rate: string;
}) {
    const OpenIDConfiguration = readJson('./wwwroot/.well-known/openid-configuration');
    const payload = {
        sub: arg.virtual_id,
        aud: arg.app_id,
        iat: arg.issue_at.getTime(),
        iss: OpenIDConfiguration['issuer'],
        exp: arg.issue_at.getTime() + (arg.expires_min ?? 480) * 60000,
        email: arg.mailaddress,
        uid: arg.user_id,
        name: arg.name,
        type: arg.account_type,
        nonce: arg.nonce,
        age: arg.age_rate,
    };
    return sign(payload, readFile('./system/openid/private.key'), { algorithm: 'RS256' });
}
